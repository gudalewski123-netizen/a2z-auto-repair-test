// Cal.com API adapter (v2) — booking + availability lookups for the AI SMS flow.
//
// The AI uses these via tool calls during a conversation:
//   1. listAvailableSlots() — what times are open in the next N days
//   2. createBooking()      — book the slot the customer agreed to
//
// Setup per client:
//   1. Client signs up at cal.com (free plan works for solo)
//   2. Connects their Google/Outlook/iCloud calendar
//   3. Creates an event type (e.g., "30-min phone consultation")
//   4. Generates an API key in Settings → Developer → API keys
//   5. We set CAL_COM_API_KEY + CAL_COM_EVENT_TYPE_ID on Render
//
// API docs: https://cal.com/docs/api-reference/v2/introduction
//
// NOTE: Cal.com's v2 API has had several iterations. Header `cal-api-version`
// pins us to a stable date so future API changes don't silently break us.
// Verify the version dates against current docs when wiring up your first
// real client.

const CAL_API_BASE = "https://api.cal.com/v2";
const CAL_SLOTS_VERSION = "2024-09-04";
const CAL_BOOKINGS_VERSION = "2024-08-13";

interface CalCreds {
  apiKey: string;
  eventTypeId: number;
}

function getCreds(): CalCreds | null {
  const apiKey = process.env.CAL_COM_API_KEY;
  const evtIdStr = process.env.CAL_COM_EVENT_TYPE_ID;
  if (!apiKey || !evtIdStr) return null;
  const eventTypeId = parseInt(evtIdStr, 10);
  if (Number.isNaN(eventTypeId)) return null;
  return { apiKey, eventTypeId };
}

export function isCalConfigured(): boolean {
  return getCreds() !== null;
}

export interface AvailableSlot {
  /** ISO 8601 datetime in UTC, e.g. "2026-05-15T18:00:00.000Z" */
  iso: string;
  /** Human-friendly label in the business's local timezone, e.g. "Thursday May 15 at 2:00 PM" */
  label: string;
}

interface ListSlotsParams {
  /** How many days ahead to look (1-14). Default 7. */
  daysAhead?: number;
  /** IANA timezone for the human-friendly label. Default "America/New_York". */
  timeZone?: string;
}

/**
 * List available booking slots for the configured Cal.com event type.
 * Returns up to 10 slots formatted for AI consumption.
 */
export async function listAvailableSlots(params: ListSlotsParams = {}): Promise<AvailableSlot[]> {
  const creds = getCreds();
  if (!creds) throw new Error("Cal.com not configured (CAL_COM_API_KEY + CAL_COM_EVENT_TYPE_ID)");

  const daysAhead = Math.min(Math.max(params.daysAhead ?? 7, 1), 14);
  const tz = params.timeZone || "America/New_York";

  const now = new Date();
  const start = new Date(now.getTime());
  // Don't offer slots in the next 2 hours (gives the business time to prep)
  start.setHours(start.getHours() + 2);
  const end = new Date(start.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const url = new URL(`${CAL_API_BASE}/slots`);
  url.searchParams.set("eventTypeId", String(creds.eventTypeId));
  // Cal.com v2 slots API (version 2024-09-04) expects `start` / `end`, NOT
  // `startTime`/`endTime`. Using the wrong names returns HTTP 400.
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      "cal-api-version": CAL_SLOTS_VERSION,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Cal.com slots API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  // Response shape (as of cal-api-version=2024-09-04):
  //   { status: "success", data: { "YYYY-MM-DD": [{ start: "...ISO..." }, ...] } }
  // NOTE: slots are keyed by date directly under `data` (no inner "slots" wrapper),
  // and each slot uses `start`, not `time`.
  const data = (await res.json()) as {
    data?: Record<string, Array<{ start: string }>>;
  };

  const slotsByDay = data.data || {};
  const flat: AvailableSlot[] = [];

  for (const dayKey of Object.keys(slotsByDay).sort()) {
    for (const slot of slotsByDay[dayKey] || []) {
      flat.push({
        iso: slot.start,
        label: formatSlotLabel(slot.start, tz),
      });
      if (flat.length >= 10) break;
    }
    if (flat.length >= 10) break;
  }
  return flat;
}

function formatSlotLabel(iso: string, timeZone: string): string {
  const d = new Date(iso);
  // Use Intl.DateTimeFormat for tz-aware formatting
  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone });
  const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  return `${dayFmt.format(d)} at ${timeFmt.format(d)}`;
}

interface CreateBookingParams {
  /** ISO 8601 datetime — must EXACTLY match a slot returned by listAvailableSlots */
  startIso: string;
  customerName: string;
  customerEmail: string;       // Cal.com requires an email
  customerPhone?: string;      // Optional but useful in the booking metadata
  notes?: string;              // Anything the customer said during the SMS exchange
  timeZone?: string;           // Defaults to America/New_York
}

export interface BookingResult {
  /** Cal.com's internal booking ID */
  bookingId: string | number;
  /** Cal.com's UID (used in the rescheduling URL) */
  bookingUid?: string;
  /** Cal.com web URL where the customer can manage the booking */
  manageUrl?: string;
  /** Confirmed start time (ISO) */
  startIso: string;
}

/**
 * Create a booking against the configured Cal.com event type.
 * Throws on any non-2xx response — caller should catch and surface to the AI.
 */
export async function createBooking(params: CreateBookingParams): Promise<BookingResult> {
  const creds = getCreds();
  if (!creds) throw new Error("Cal.com not configured");

  const url = `${CAL_API_BASE}/bookings`;

  // Sanitize a placeholder email if customer didn't provide one. Cal.com
  // allows any well-formed email; the customer just won't get the email
  // confirmation (we send our own SMS confirmation instead).
  const email = params.customerEmail.trim() || synthesizeEmail(params.customerPhone);

  const body = {
    start: params.startIso,
    eventTypeId: creds.eventTypeId,
    attendee: {
      name: params.customerName,
      email,
      timeZone: params.timeZone || "America/New_York",
      phoneNumber: params.customerPhone,
    },
    metadata: {
      source: "sms-ai-bot",
      ...(params.notes ? { notes: params.notes } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      "cal-api-version": CAL_BOOKINGS_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Cal.com booking API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: { id?: string | number; uid?: string; rescheduleUrl?: string; start?: string };
  };

  if (!data.data?.id) {
    throw new Error(`Cal.com returned 2xx but no booking id: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return {
    bookingId: data.data.id,
    bookingUid: data.data.uid,
    manageUrl: data.data.rescheduleUrl,
    startIso: data.data.start || params.startIso,
  };
}

function synthesizeEmail(phone: string | undefined): string {
  if (!phone) return "noreply@sms-ai-bot.local";
  // E.164 like "+15555550199" → "5555550199@sms.placeholder"
  const digits = phone.replace(/\D/g, "");
  return `${digits}@sms.placeholder`;
}

interface RescheduleParams {
  /** The Cal.com booking UID (string slug, NOT the numeric ID) */
  bookingUid: string;
  /** ISO 8601 datetime — must match a slot returned by listAvailableSlots */
  newStartIso: string;
  /** Why it's being rescheduled — Cal.com requires/recommends this */
  rescheduledByName?: string;
  reason?: string;
}

export interface RescheduleResult {
  bookingUid: string;
  newStartIso: string;
}

/**
 * Reschedule an existing booking to a new time slot.
 * Throws on any non-2xx response.
 */
export async function rescheduleBooking(params: RescheduleParams): Promise<RescheduleResult> {
  const creds = getCreds();
  if (!creds) throw new Error("Cal.com not configured");

  const url = `${CAL_API_BASE}/bookings/${encodeURIComponent(params.bookingUid)}/reschedule`;

  const body = {
    start: params.newStartIso,
    rescheduledBy: params.rescheduledByName || "sms-ai-bot",
    reschedulingReason: params.reason || "Customer requested via SMS",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      "cal-api-version": CAL_BOOKINGS_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Cal.com reschedule API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = (await res.json()) as { data?: { uid?: string; start?: string } };
  return {
    bookingUid: data.data?.uid || params.bookingUid,
    newStartIso: data.data?.start || params.newStartIso,
  };
}

interface CancelParams {
  bookingUid: string;
  reason?: string;
}

/**
 * Cancel an existing booking. Returns void on success — Cal.com just confirms.
 * Throws on any non-2xx response.
 */
export async function cancelBooking(params: CancelParams): Promise<void> {
  const creds = getCreds();
  if (!creds) throw new Error("Cal.com not configured");

  const url = `${CAL_API_BASE}/bookings/${encodeURIComponent(params.bookingUid)}/cancel`;

  const body = {
    cancellationReason: params.reason || "Customer requested cancellation via SMS",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      "cal-api-version": CAL_BOOKINGS_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Cal.com cancel API ${res.status}: ${errBody.slice(0, 300)}`);
  }
}
