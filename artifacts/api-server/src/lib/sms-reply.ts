// SMS reply generator. Three execution modes — picks the best available:
//
//   1. AI + Cal.com tools (Phase 2D + 2E)
//      Anthropic Claude Haiku 4.5 with `check_availability`, `book_appointment`,
//      `reschedule_appointment`, and `cancel_appointment` tools. AI runs a
//      multi-turn loop, calling tools to manage the customer's booking.
//      Requires: ANTHROPIC_API_KEY + CAL_COM_API_KEY + CAL_COM_EVENT_TYPE_ID
//
//   2. AI without tools (Phase 2B)
//      Same Claude model but no tool access — qualifies the lead and
//      suggests "we'll call you back". Requires: ANTHROPIC_API_KEY only
//
//   3. Static template (no API keys)
//      Friendly canned responses. Requires: nothing.
//
// Caller code is identical for all three — generateReply() returns the
// same shape regardless. The `source` field tells you which path ran.
// `bookingState` captures any Cal.com side effects (booked / rescheduled /
// cancelled) so the route handler can update the conversation row.

import { listAvailableSlots, createBooking, rescheduleBooking, cancelBooking, isCalConfigured } from "./cal-com";

interface BusinessContext {
  name: string;
  trade: string;
  location: string;
  phone: string;
  /** E.164 phone of the customer (caller). Used as default in book_appointment. */
  callerPhone?: string;
}

interface ExistingBooking {
  /** Cal.com booking UID (string slug, used in reschedule/cancel API calls) */
  uid: string;
  /** ISO 8601 start time */
  scheduledAtIso: string;
}

export interface ReplyContext {
  business: BusinessContext;
  conversationHistory: Array<{ direction: "inbound" | "outbound"; body: string }>;
  latestInbound: string;
  /** If this customer has a current booking (from a prior turn), AI can reschedule/cancel it. */
  existingBooking?: ExistingBooking;
}

/** Side effects the AI performed this turn — caller updates DB to match. */
export interface BookingState {
  /** AI booked a NEW appointment this turn */
  newBooking?: { uid: string; scheduledAtIso: string };
  /** AI rescheduled the existing booking — the uid stays the same */
  rescheduled?: { uid: string; scheduledAtIso: string };
  /** AI cancelled the existing booking */
  cancelled?: { uid: string };
}

export interface ReplyResult {
  text: string;
  source: "ai" | "template";
  /** Only populated when AI took booking actions during this turn (Phase 2D/2E). */
  bookingState?: BookingState;
}

interface PinoLikeLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const ANTHROPIC_MODEL = "claude-haiku-4-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_TOOL_ITERATIONS = 5;

// =====================================================================
//  Public entry point
// =====================================================================

export async function generateReply(
  ctx: ReplyContext,
  logger?: PinoLikeLogger,
): Promise<ReplyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const useTools = isCalConfigured();
    try {
      if (useTools) {
        const out = await generateWithToolsLoop(ctx, apiKey, logger);
        if (out.text && out.text.trim().length > 0) {
          return { text: out.text.trim(), source: "ai", bookingState: out.bookingState };
        }
      } else {
        const text = await generateSingleShot(ctx, apiKey, logger);
        if (text && text.trim().length > 0) {
          return { text: text.trim(), source: "ai" };
        }
      }
      logger?.warn("AI returned empty reply; falling back to template");
    } catch (err) {
      logger?.warn(
        { err: err instanceof Error ? err.message : err },
        "AI reply failed; falling back to template",
      );
    }
  }
  return { text: templateReply(ctx), source: "template" };
}

// =====================================================================
//  Mode 3: static template (no AI)
// =====================================================================

function templateReply(ctx: ReplyContext): string {
  const isFirstReply =
    ctx.conversationHistory.filter((m) => m.direction === "outbound").length === 0;

  if (isFirstReply) {
    return `Hi! ${ctx.business.name} here — sorry we missed your call. We do ${ctx.business.trade} in ${ctx.business.location}. What can we help with?`;
  }
  return `Got it — thanks for the details. Someone from ${ctx.business.name} will follow up shortly. For anything urgent, call ${ctx.business.phone}.`;
}

// =====================================================================
//  Mode 2: AI single-shot (no tools)
// =====================================================================

async function generateSingleShot(
  ctx: ReplyContext,
  apiKey: string,
  logger?: PinoLikeLogger,
): Promise<string> {
  const systemPrompt = noToolsSystemPrompt(ctx);
  const messages = buildMessages(ctx);

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: anthropicHeaders(apiKey),
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.find((c) => c.type === "text")?.text || "";
}

function noToolsSystemPrompt(ctx: ReplyContext): string {
  return [
    `You are an SMS auto-reply assistant for ${ctx.business.name}, a ${ctx.business.trade} business in ${ctx.business.location}.`,
    `Your job: respond briefly to qualify the lead and move toward booking a callback or appointment.`,
    `Keep replies under 320 characters (SMS-friendly). Plain text. No markdown. No emoji unless the customer used one.`,
    `Ask one question at a time. Be friendly and direct — sound like a human, not a bot.`,
    `If they describe what they need, suggest a callback time ("Can someone call you at 2pm today?").`,
    `If they ask price, deflect to a callback: "We can give you an exact quote after a 5-min call — when's good?".`,
    `End every reply with: "— ${ctx.business.name}"`,
  ].join(" ");
}

// =====================================================================
//  Mode 1: AI with Cal.com booking tools (Phase 2D + 2E)
// =====================================================================

interface ContentBlock {
  type: string;
  text?: string;
  // tool_use blocks
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  // tool_result blocks
  tool_use_id?: string;
  content?: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

const TOOLS = [
  {
    name: "check_availability",
    description:
      "Check available appointment slots in the next N days. Returns up to 10 slots with friendly labels and ISO timestamps. Call this BEFORE proposing specific times to the customer — never make up slot times.",
    input_schema: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description: "How many days ahead to look (1-14). Default 7.",
        },
      },
    },
  },
  {
    name: "book_appointment",
    description:
      "Book a NEW appointment for the customer. Use the EXACT iso timestamp from a check_availability result — do not modify or round it. Don't call this if the customer already has an existing booking — use reschedule_appointment instead.",
    input_schema: {
      type: "object",
      properties: {
        start_time_iso: { type: "string", description: "ISO 8601, copied exactly from check_availability." },
        customer_name: { type: "string", description: "Customer's first + last name (or first if that's all you have)." },
        customer_phone: { type: "string", description: "Customer's phone (E.164 format)." },
        customer_email: { type: "string", description: "Optional. Leave blank if not given." },
        notes: { type: "string", description: "Brief description of what the customer needs." },
      },
      required: ["start_time_iso", "customer_name", "customer_phone"],
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "Move the customer's EXISTING booking to a new time. Only call this if the system prompt mentions a current booking with a UID. Use the EXACT iso timestamp from a check_availability result for the new slot.",
    input_schema: {
      type: "object",
      properties: {
        booking_uid: { type: "string", description: "The booking UID from the system prompt's 'Existing booking' section." },
        new_start_time_iso: { type: "string", description: "ISO 8601 of the new slot, copied exactly from check_availability." },
        reason: { type: "string", description: "Brief reason customer gave (optional)." },
      },
      required: ["booking_uid", "new_start_time_iso"],
    },
  },
  {
    name: "cancel_appointment",
    description:
      "Cancel the customer's EXISTING booking entirely. Only call this if the system prompt mentions a current booking with a UID. Confirm with the customer first before calling.",
    input_schema: {
      type: "object",
      properties: {
        booking_uid: { type: "string", description: "The booking UID from the system prompt's 'Existing booking' section." },
        reason: { type: "string", description: "Brief reason customer gave (optional)." },
      },
      required: ["booking_uid"],
    },
  },
] as const;

async function generateWithToolsLoop(
  ctx: ReplyContext,
  apiKey: string,
  logger?: PinoLikeLogger,
): Promise<{ text: string; bookingState: BookingState }> {
  const systemPrompt = withToolsSystemPrompt(ctx);
  const messages: Array<{ role: "user" | "assistant"; content: string | ContentBlock[] }> = buildMessages(ctx);
  const bookingState: BookingState = {};

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: anthropicHeaders(apiKey),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 600,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = (await res.json()) as { content?: ContentBlock[]; stop_reason?: string };
    const content = data.content || [];
    const toolUses = content.filter((c) => c.type === "tool_use");

    if (toolUses.length === 0) {
      const textBlock = content.find((c) => c.type === "text");
      return { text: textBlock?.text || "", bookingState };
    }

    const toolResults: ContentBlock[] = [];
    for (const tu of toolUses) {
      const result = await executeTool(tu.name || "", (tu.input as Record<string, unknown>) || {}, ctx, bookingState, logger);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id || "",
        content: result.text,
        is_error: result.isError || undefined,
      });
    }

    messages.push({ role: "assistant", content });
    messages.push({ role: "user", content: toolResults });
  }

  logger?.warn("AI hit MAX_TOOL_ITERATIONS without producing a final text reply");
  return { text: "", bookingState };
}

function withToolsSystemPrompt(ctx: ReplyContext): string {
  const lines = [
    `You are an SMS auto-reply assistant for ${ctx.business.name}, a ${ctx.business.trade} business in ${ctx.business.location}.`,
    `Your job: handle the conversation end-to-end — qualify the lead, propose 2-3 specific available times, and BOOK the appointment when the customer agrees. You can also RESCHEDULE or CANCEL existing bookings.`,
    ``,
    `Tools available:`,
    `- check_availability: query the calendar. Always call this BEFORE suggesting specific times. Never make up times.`,
    `- book_appointment: confirm a NEW slot. Customer's phone is "${ctx.business.callerPhone || "unknown"}". Don't use this if they already have an existing booking — use reschedule_appointment instead.`,
    `- reschedule_appointment: move the customer's existing booking. Use the booking UID from "Existing booking" below.`,
    `- cancel_appointment: cancel the customer's existing booking entirely. Confirm before calling.`,
    ``,
  ];

  if (ctx.existingBooking) {
    lines.push(
      `Existing booking for this customer:`,
      `  UID:       ${ctx.existingBooking.uid}`,
      `  Scheduled: ${ctx.existingBooking.scheduledAtIso}`,
      ``,
      `If the customer wants to reschedule: call check_availability, propose 2-3 new times, then call reschedule_appointment with the UID above + the new ISO timestamp.`,
      `If the customer wants to cancel: confirm explicitly ("Got it, cancelling your appointment for [date]?"), then call cancel_appointment with the UID.`,
      `If the customer wants to book ADDITIONAL service (separate appointment): use book_appointment as normal.`,
      ``,
    );
  } else {
    lines.push(`The customer has no existing booking. Use book_appointment for any new appointment.`, ``);
  }

  lines.push(
    `Conversation rules:`,
    `- Each SMS reply under 320 characters. Plain text. No markdown. No emoji unless the customer used one.`,
    `- Ask ONE question per message. Sound like a human.`,
    `- When proposing times, give 2-3 specific options in one message ("Friday 2pm, Monday 10am, or Tuesday 1pm — which works?").`,
    `- After a successful tool call, confirm the action in plain English ("Booked you for Friday at 2pm" / "Rescheduled to Monday 10am" / "Cancelled — let us know if you'd like to rebook").`,
    `- If a tool errors, recover gracefully — offer to have someone call them back.`,
    ``,
    `End every customer-facing reply with "— ${ctx.business.name}".`,
  );

  return lines.join("\n");
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ReplyContext,
  bookingState: BookingState,
  logger?: PinoLikeLogger,
): Promise<{ text: string; isError?: boolean }> {
  try {
    if (name === "check_availability") {
      const daysAhead = typeof input.days_ahead === "number" ? input.days_ahead : 7;
      const slots = await listAvailableSlots({ daysAhead });
      if (slots.length === 0) {
        return { text: "No available slots in the requested window. Try a longer window or fall back to a callback." };
      }
      const lines = slots.map((s, i) => `${i + 1}. ${s.label} — ISO: ${s.iso}`);
      return { text: `Available slots (use the ISO value exactly when booking):\n${lines.join("\n")}` };
    }

    if (name === "book_appointment") {
      const startIso = String(input.start_time_iso || "");
      const customerName = String(input.customer_name || "").trim();
      const customerPhone = String(input.customer_phone || ctx.business.callerPhone || "").trim();
      const customerEmail = String(input.customer_email || "").trim();
      const notes = String(input.notes || "").trim();

      if (!startIso || !customerName || !customerPhone) {
        return {
          text: "Booking failed: missing one of start_time_iso, customer_name, customer_phone. Ask the customer for the missing field.",
          isError: true,
        };
      }

      const result = await createBooking({ startIso, customerName, customerEmail, customerPhone, notes });
      if (result.bookingUid) {
        bookingState.newBooking = { uid: result.bookingUid, scheduledAtIso: result.startIso };
      }
      return {
        text: `Booking confirmed. UID: ${result.bookingUid || result.bookingId}. Confirmed start: ${result.startIso}. Reply to the customer in plain English confirming the appointment.`,
      };
    }

    if (name === "reschedule_appointment") {
      const bookingUid = String(input.booking_uid || ctx.existingBooking?.uid || "").trim();
      const newStartIso = String(input.new_start_time_iso || "").trim();
      const reason = String(input.reason || "").trim();

      if (!bookingUid || !newStartIso) {
        return {
          text: "Reschedule failed: missing booking_uid or new_start_time_iso. Ask the customer to confirm the new time.",
          isError: true,
        };
      }

      const result = await rescheduleBooking({
        bookingUid,
        newStartIso,
        reason,
      });
      bookingState.rescheduled = { uid: result.bookingUid, scheduledAtIso: result.newStartIso };
      return {
        text: `Reschedule confirmed. New start: ${result.newStartIso}. Reply to the customer confirming the new time in plain English.`,
      };
    }

    if (name === "cancel_appointment") {
      const bookingUid = String(input.booking_uid || ctx.existingBooking?.uid || "").trim();
      const reason = String(input.reason || "").trim();

      if (!bookingUid) {
        return {
          text: "Cancel failed: no booking_uid available. Tell the customer you don't see an existing booking and ask if they want to make a new one.",
          isError: true,
        };
      }

      await cancelBooking({ bookingUid, reason });
      bookingState.cancelled = { uid: bookingUid };
      return {
        text: `Cancellation confirmed. Reply to the customer in plain English confirming the cancellation and offering to rebook.`,
      };
    }

    return { text: `Unknown tool: ${name}`, isError: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    logger?.warn({ tool: name, err: msg }, "Tool execution failed");
    return { text: `Tool ${name} failed: ${msg}. Recover by offering a manual callback instead.`, isError: true };
  }
}

// =====================================================================
//  Helpers
// =====================================================================

function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  };
}

function buildMessages(ctx: ReplyContext): Array<{ role: "user" | "assistant"; content: string | ContentBlock[] }> {
  const messages = ctx.conversationHistory.slice(-8).map((m) => ({
    role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
    content: m.body,
  }));
  if (messages.length === 0) {
    messages.push({ role: "user", content: ctx.latestInbound });
  }
  return messages;
}
