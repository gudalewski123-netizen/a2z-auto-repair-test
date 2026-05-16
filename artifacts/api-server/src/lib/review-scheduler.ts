// Auto-fire review-request scheduler.
//
// The dashboard's "Mark job complete → review-request SMS" flow is great
// when the admin remembers to click. This module makes it automatic:
// every N minutes, find jobs whose appointment was at least DELAY_HOURS in
// the past and haven't yet been completed → mark them complete + fire the
// review-request SMS.
//
// Defaults:
//   REVIEW_REQUEST_DELAY_HOURS    = 3   (how long after appt before SMS)
//   REVIEW_SCHEDULER_INTERVAL_MIN = 10  (how often to poll the DB)
//
// Set REVIEW_SCHEDULER_DISABLED=true to turn off the scheduler entirely
// (e.g. during local dev). The first tick runs ~60s after server start to
// avoid hammering the DB during boot.
//
// Idempotency: jobs with completedAt or reviewRequestSentAt already set
// are skipped. So if the admin manually marked complete first, no double
// SMS. Same logic the manual /complete endpoint already uses.

import { db, jobsTable, contactsTable } from "@workspace/db";
import { and, eq, isNull, lte, gte, isNotNull } from "drizzle-orm";
import { sendReviewRequest } from "./review-request";
import { listRecentBookings, isCalConfigured } from "./cal-com";
import { syncBookingCreated } from "./crm-sync";
import { sendSms } from "./twilio";
import { logger as rootLogger } from "./logger";

const DEFAULT_DELAY_HOURS = 3;
const DEFAULT_INTERVAL_MINUTES = 10;
const DEFAULT_REMINDER_HOURS_BEFORE = 24;
const DEFAULT_RECURRING_DAYS = 90;
const STARTUP_DELAY_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

interface CandidateJob {
  jobId: number;
  contactId: number;
  serviceType: string;
  date: string | null;
  customerName: string;
  customerPhone: string;
}

async function findCandidates(cutoffIso: string): Promise<CandidateJob[]> {
  // Jobs that:
  //   - have a `date` (so we can compare it to the cutoff)
  //   - date <= cutoff (appointment was at least DELAY_HOURS ago)
  //   - completedAt IS NULL (not yet marked complete)
  //   - reviewRequestSentAt IS NULL (review SMS not yet sent)
  // We don't filter by calBookingUid — admin-entered jobs can also be
  // auto-completed if they have a `date`. (No-show edge case: per
  // explicit user direction, we always send.)
  const rows = await db
    .select({
      jobId: jobsTable.id,
      contactId: contactsTable.id,
      serviceType: jobsTable.serviceType,
      date: jobsTable.date,
      customerName: contactsTable.name,
      customerPhone: contactsTable.phone,
    })
    .from(jobsTable)
    .innerJoin(contactsTable, eq(contactsTable.id, jobsTable.contactId))
    .where(
      and(
        isNotNull(jobsTable.date),
        lte(jobsTable.date, cutoffIso),
        isNull(jobsTable.completedAt),
        isNull(jobsTable.reviewRequestSentAt),
      ),
    )
    .limit(20); // soft cap per tick — runaway protection
  return rows;
}

async function processOne(job: CandidateJob): Promise<{ ok: boolean; reason?: string }> {
  // 1. Mark complete
  await db
    .update(jobsTable)
    .set({ completedAt: new Date() })
    .where(eq(jobsTable.id, job.jobId));

  // 2. Send review SMS
  const result = await sendReviewRequest(
    {
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      serviceType: job.serviceType,
      twilioNumber: process.env.TWILIO_PHONE_NUMBER || "",
      businessName: process.env.BUSINESS_NAME || "us",
      reviewUrl: process.env.REVIEW_REQUEST_URL || "",
    },
    rootLogger,
  );

  if (!result.ok) {
    rootLogger.warn({ jobId: job.jobId, err: result.error }, "Auto-completion: review SMS send failed");
    // Leave reviewRequestSentAt NULL so a future tick can retry.
    // (Or via POST /jobs/:id/resend-review-request manually.)
    return { ok: false, reason: result.error };
  }

  // 3. Mark review-sent so we don't double-fire
  await db
    .update(jobsTable)
    .set({ reviewRequestSentAt: new Date() })
    .where(eq(jobsTable.id, job.jobId));

  rootLogger.info(
    { jobId: job.jobId, contactPhone: job.customerPhone, sid: result.sid },
    "Auto-completion: marked complete + review SMS fired",
  );
  return { ok: true };
}

/**
 * Poll Cal.com for bookings that ENDED between (delayHours ago) and
 * (delayHours + 24h ago). For each one not yet in the CRM, create a
 * contact + job. The next half of the tick (findCandidates) will then
 * pick them up and fire the review SMS.
 *
 * This catches bookings that came in directly through Cal.com (e.g. the
 * website's booking widget) and never went through the SMS AI flow —
 * without it, those customers would never receive a review-request SMS.
 *
 * Skipped silently if CAL_COM_API_KEY isn't set.
 */
async function pollCalComForCompletedBookings(delayHours: number): Promise<number> {
  if (!isCalConfigured()) return 0;

  const now = Date.now();
  // Look back 24h beyond the delay window so we catch bookings that ended
  // between (e.g.) 3h and 27h ago. Ticks run every 10 min so this overlap
  // is intentional — gives us multiple chances to catch each booking.
  const beforeStartIso = new Date(now - delayHours * 60 * 60 * 1000).toISOString();
  const afterStartIso = new Date(now - (delayHours + 24) * 60 * 60 * 1000).toISOString();

  let bookings;
  try {
    bookings = await listRecentBookings({ afterStartIso, beforeStartIso });
  } catch (err) {
    rootLogger.warn(
      { err: err instanceof Error ? err.message : err },
      "Review scheduler: Cal.com poll failed (skipping this tick)",
    );
    return 0;
  }

  let importedCount = 0;
  for (const b of bookings) {
    // Only sync bookings that are confirmed and have a phone number to text
    if (b.status !== "accepted") continue;
    if (!b.customerPhone) continue;

    // Already synced (either via the SMS flow or a previous poll)?
    const [existing] = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(eq(jobsTable.calBookingUid, b.uid))
      .limit(1);
    if (existing) continue;

    // Create the CRM contact + job. The next phase of this tick will see it
    // (date < cutoff) and fire the review SMS.
    const result = await syncBookingCreated(
      {
        calBookingUid: b.uid,
        startIso: b.startIso,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        serviceType: process.env.BUSINESS_TRADE || "Service",
        notes: b.notes || "Booked directly via Cal.com",
      },
      rootLogger,
    );

    if (result.jobId) {
      importedCount++;
    }
  }

  if (importedCount > 0) {
    rootLogger.info(
      { importedCount },
      "Review scheduler: imported new Cal.com bookings into CRM",
    );
  }
  return importedCount;
}

// =====================================================================
//  Tier-S bundle: 24h pre-appointment reminders
// =====================================================================

/**
 * Fire a "your appointment is tomorrow" SMS for each upcoming job whose
 * `date` is between (now + reminderHours - INTERVAL/2) and (now +
 * reminderHours + INTERVAL/2). This window catches every appointment
 * exactly once even though ticks fire every 10 min.
 *
 * We skip jobs that have reminderSentAt set (idempotent) or are already
 * completed/cancelled (no point reminding for a job that's done).
 */
async function processUpcomingReminders(): Promise<number> {
  const reminderHours = Number(process.env.REMINDER_HOURS_BEFORE || DEFAULT_REMINDER_HOURS_BEFORE);
  const intervalMin = Number(process.env.REVIEW_SCHEDULER_INTERVAL_MIN || DEFAULT_INTERVAL_MINUTES);
  const halfIntervalMs = (intervalMin / 2) * 60 * 1000;

  const target = Date.now() + reminderHours * 60 * 60 * 1000;
  const lowerIso = new Date(target - halfIntervalMs).toISOString();
  const upperIso = new Date(target + halfIntervalMs).toISOString();

  const candidates = await db
    .select({
      jobId: jobsTable.id,
      date: jobsTable.date,
      serviceType: jobsTable.serviceType,
      customerName: contactsTable.name,
      customerPhone: contactsTable.phone,
    })
    .from(jobsTable)
    .innerJoin(contactsTable, eq(contactsTable.id, jobsTable.contactId))
    .where(
      and(
        isNotNull(jobsTable.date),
        gte(jobsTable.date, lowerIso),
        lte(jobsTable.date, upperIso),
        isNull(jobsTable.completedAt),
        isNull(jobsTable.reminderSentAt),
      ),
    )
    .limit(50);

  if (candidates.length === 0) return 0;

  const businessName = process.env.BUSINESS_NAME || "us";
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || "";
  let firedCount = 0;

  for (const c of candidates) {
    if (!c.customerPhone) continue;
    const apptDate = new Date(c.date!);
    const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/New_York" }).format(apptDate);
    const timeLabel = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(apptDate);

    const body = `Hey ${c.customerName.split(" ")[0]} — just a heads up, we'll see you ${dayLabel} at ${timeLabel} for your ${c.serviceType.toLowerCase()}. Reply C to cancel. — ${businessName}`;

    const result = await sendSms({ to: c.customerPhone, body, from: fromNumber });
    if (result.ok) {
      await db.update(jobsTable).set({ reminderSentAt: new Date() }).where(eq(jobsTable.id, c.jobId));
      rootLogger.info({ jobId: c.jobId, sid: result.sid }, "Reminder scheduler: 24h SMS fired");
      firedCount++;
    } else {
      rootLogger.warn({ jobId: c.jobId, err: result.error }, "Reminder scheduler: SMS send failed");
    }
  }

  return firedCount;
}

// =====================================================================
//  Tier-S bundle: recurring service reminders
// =====================================================================

/**
 * Fire a "time for another [service]?" SMS for each completed job whose
 * `completedAt` is exactly RECURRING_DAYS ago (within the tick interval).
 * Idempotent via recurringReminderSentAt.
 *
 * Per-trade default: 90 days for most trades. Configurable via
 * RECURRING_REMINDER_DAYS env var (e.g. 180 for HVAC, 30 for hair salons).
 * Set RECURRING_REMINDER_DISABLED=true to skip entirely.
 */
async function processRecurringReminders(): Promise<number> {
  if (process.env.RECURRING_REMINDER_DISABLED?.toLowerCase() === "true") return 0;

  const recurringDays = Number(process.env.RECURRING_REMINDER_DAYS || DEFAULT_RECURRING_DAYS);
  const intervalMin = Number(process.env.REVIEW_SCHEDULER_INTERVAL_MIN || DEFAULT_INTERVAL_MINUTES);
  // Window the cutoff by the tick interval so we catch each job once.
  const target = Date.now() - recurringDays * 24 * 60 * 60 * 1000;
  const lower = new Date(target - intervalMin * 60 * 1000 / 2);
  const upper = new Date(target + intervalMin * 60 * 1000 / 2);

  const candidates = await db
    .select({
      jobId: jobsTable.id,
      serviceType: jobsTable.serviceType,
      customerName: contactsTable.name,
      customerPhone: contactsTable.phone,
    })
    .from(jobsTable)
    .innerJoin(contactsTable, eq(contactsTable.id, jobsTable.contactId))
    .where(
      and(
        isNotNull(jobsTable.completedAt),
        gte(jobsTable.completedAt, lower),
        lte(jobsTable.completedAt, upper),
        isNull(jobsTable.recurringReminderSentAt),
      ),
    )
    .limit(50);

  if (candidates.length === 0) return 0;

  const businessName = process.env.BUSINESS_NAME || "us";
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || "";
  let firedCount = 0;

  for (const c of candidates) {
    if (!c.customerPhone) continue;
    const body = `Hey ${c.customerName.split(" ")[0]} — it's been about ${recurringDays} days since your last ${c.serviceType.toLowerCase()}. Want to book another? — ${businessName}`;

    const result = await sendSms({ to: c.customerPhone, body, from: fromNumber });
    if (result.ok) {
      await db.update(jobsTable).set({ recurringReminderSentAt: new Date() }).where(eq(jobsTable.id, c.jobId));
      rootLogger.info({ jobId: c.jobId, sid: result.sid }, "Recurring scheduler: nudge SMS fired");
      firedCount++;
    } else {
      rootLogger.warn({ jobId: c.jobId, err: result.error }, "Recurring scheduler: SMS send failed");
    }
  }

  return firedCount;
}

async function tick(): Promise<void> {
  const delayHours = Number(process.env.REVIEW_REQUEST_DELAY_HOURS || DEFAULT_DELAY_HOURS);

  try {
    // Step 1: import any Cal.com bookings that aren't yet in the CRM. This
    // runs FIRST so the new jobs are visible to findCandidates() below in
    // the same tick (no need to wait 10 min for the next one).
    await pollCalComForCompletedBookings(delayHours);

    // Step 2: 24h-out reminders (Tier-S bundle)
    await processUpcomingReminders();

    // Step 3: recurring service reminders (Tier-S bundle)
    await processRecurringReminders();

    // Step 4: find CRM jobs that are overdue + send the review SMS.
    const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString();
    const candidates = await findCandidates(cutoffIso);
    if (candidates.length === 0) return;

    rootLogger.info({ count: candidates.length, cutoffIso }, "Review scheduler: processing overdue jobs");
    for (const job of candidates) {
      try {
        await processOne(job);
      } catch (err) {
        rootLogger.warn(
          { jobId: job.jobId, err: err instanceof Error ? err.message : err },
          "Review scheduler: failed to process job",
        );
      }
    }
  } catch (err) {
    rootLogger.error(
      { err: err instanceof Error ? err.message : err },
      "Review scheduler: tick failed",
    );
  }
}

/**
 * Start the recurring scheduler. Safe to call once at server startup.
 * If REVIEW_SCHEDULER_DISABLED=true (any truthy string), no-op.
 */
export function startReviewScheduler(): void {
  if (timer) return; // already running
  if (process.env.REVIEW_SCHEDULER_DISABLED?.toLowerCase() === "true") {
    rootLogger.info("Review scheduler disabled via REVIEW_SCHEDULER_DISABLED=true");
    return;
  }

  const intervalMin = Number(process.env.REVIEW_SCHEDULER_INTERVAL_MIN || DEFAULT_INTERVAL_MINUTES);
  const intervalMs = intervalMin * 60 * 1000;

  rootLogger.info(
    {
      delayHours: Number(process.env.REVIEW_REQUEST_DELAY_HOURS || DEFAULT_DELAY_HOURS),
      intervalMinutes: intervalMin,
    },
    "Review scheduler starting",
  );

  // First tick after startup delay (avoid DB pressure during boot).
  // Subsequent ticks at the configured interval.
  setTimeout(() => {
    tick().catch((err) =>
      rootLogger.error({ err: err instanceof Error ? err.message : err }, "Review scheduler initial tick failed"),
    );
    timer = setInterval(() => {
      tick().catch((err) =>
        rootLogger.error({ err: err instanceof Error ? err.message : err }, "Review scheduler tick failed"),
      );
    }, intervalMs);
  }, STARTUP_DELAY_MS);
}

/** Stop the scheduler. Mostly for tests + graceful shutdown. */
export function stopReviewScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
