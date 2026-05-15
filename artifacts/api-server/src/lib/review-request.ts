// Review-request SMS helper. Called when a job is marked complete (Phase 2C).
//
// Sends a single SMS to the customer asking them to leave a review at
// REVIEW_REQUEST_URL (typically a Google Business Profile review link).
// If ANTHROPIC_API_KEY is set, the message is AI-generated for tone variation
// (so customers don't get the same canned message every time). Otherwise a
// friendly static template is used.
//
// Records the outbound message into sms_messages, attached to a conversation
// keyed by (customerPhone, twilioNumber) — same conversation table the
// missed-call flow uses. That way an admin viewing the conversation sees
// the full history including review requests.

import { db, smsConversationsTable, smsMessagesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { sendSms } from "./twilio";

interface ReviewRequestParams {
  customerName: string;       // From contacts.name
  customerPhone: string;      // From contacts.phone (E.164 if possible)
  serviceType: string;        // From jobs.serviceType
  twilioNumber: string;       // The client's TWILIO_PHONE_NUMBER env
  businessName: string;       // From BUSINESS_NAME env
  reviewUrl: string;          // From REVIEW_REQUEST_URL env
}

interface PinoLikeLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface ReviewRequestResult {
  ok: boolean;
  conversationId?: number;
  messageId?: number;
  twilioSid?: string;
  source?: "ai" | "template";
  error?: string;
}

const ANTHROPIC_MODEL = "claude-haiku-4-5";

/**
 * Build the review-request message body. Tries Anthropic Claude when
 * ANTHROPIC_API_KEY is set; falls back to a static template otherwise.
 */
async function buildMessage(
  params: ReviewRequestParams,
  logger?: PinoLikeLogger,
): Promise<{ text: string; source: "ai" | "template" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const text = await buildWithClaude(params, apiKey);
      if (text && text.trim().length > 0) {
        return { text: text.trim(), source: "ai" };
      }
      logger?.warn("AI review-request returned empty; using template");
    } catch (err) {
      logger?.warn(
        { err: err instanceof Error ? err.message : err },
        "AI review-request failed; using template",
      );
    }
  }
  return { text: templateMessage(params), source: "template" };
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

function templateMessage(p: ReviewRequestParams): string {
  return `Hi ${firstName(p.customerName)} — thanks for choosing ${p.businessName} for your ${p.serviceType.toLowerCase()}! If you've got 30 seconds, we'd love a quick review: ${p.reviewUrl}`;
}

async function buildWithClaude(p: ReviewRequestParams, apiKey: string): Promise<string> {
  const systemPrompt = [
    `You write SMS messages asking happy customers for a Google review on behalf of ${p.businessName}.`,
    `Output ONLY the message body (no quotes, no preamble, no commentary).`,
    `Constraints: under 200 characters total INCLUDING the URL. Plain text. Friendly, casual, no emoji.`,
    `Always include the review URL exactly as given. Always greet by first name. Mention the service type once.`,
    `Don't beg. Don't say "5 stars". Don't say "if you were happy" — assume they were.`,
    `End with the URL on its own (no trailing period after the URL).`,
  ].join(" ");

  const userMessage = `Customer first name: ${firstName(p.customerName)}
Service: ${p.serviceType}
Review URL: ${p.reviewUrl}

Write the message.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.find((c) => c.type === "text")?.text || "";
}

/**
 * Send the review request SMS, log it to sms_messages, and return the result.
 * Returns { ok: false } with an error when prerequisites are missing — caller
 * should check ok and decide how to surface the failure to the admin.
 */
export async function sendReviewRequest(
  params: ReviewRequestParams,
  logger?: PinoLikeLogger,
): Promise<ReviewRequestResult> {
  if (!params.customerPhone || !params.twilioNumber) {
    return { ok: false, error: "missing customer phone or Twilio number" };
  }
  if (!params.reviewUrl) {
    return { ok: false, error: "REVIEW_REQUEST_URL env var not set" };
  }

  const built = await buildMessage(params, logger);

  // Find or create the conversation (so the review-request appears in the
  // SMS conversation view alongside any missed-call exchange we had with
  // this customer earlier).
  const existing = await db
    .select()
    .from(smsConversationsTable)
    .where(
      and(
        eq(smsConversationsTable.callerPhone, params.customerPhone),
        eq(smsConversationsTable.twilioNumber, params.twilioNumber),
      ),
    )
    .limit(1);

  let convId: number;
  if (existing.length > 0) {
    convId = existing[0].id;
    await db
      .update(smsConversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(smsConversationsTable.id, convId));
  } else {
    const [created] = await db
      .insert(smsConversationsTable)
      .values({
        callerPhone: params.customerPhone,
        twilioNumber: params.twilioNumber,
        trigger: "manual",
      })
      .returning({ id: smsConversationsTable.id });
    convId = created.id;
  }

  const sendResult = await sendSms({
    to: params.customerPhone,
    body: built.text,
    from: params.twilioNumber,
  });

  const [msg] = await db
    .insert(smsMessagesTable)
    .values({
      conversationId: convId,
      direction: "outbound",
      body: built.text,
      twilioSid: sendResult.sid,
      source: built.source,
      status: sendResult.ok ? "sent" : "failed",
    })
    .returning({ id: smsMessagesTable.id });

  if (!sendResult.ok) {
    return {
      ok: false,
      conversationId: convId,
      messageId: msg.id,
      source: built.source,
      error: sendResult.error,
    };
  }

  return {
    ok: true,
    conversationId: convId,
    messageId: msg.id,
    twilioSid: sendResult.sid,
    source: built.source,
  };
}
