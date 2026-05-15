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
import { and, eq, isNull, lte, isNotNull } from "drizzle-orm";
import { sendReviewRequest } from "./review-request";
import { logger as rootLogger } from "./logger";

const DEFAULT_DELAY_HOURS = 3;
const DEFAULT_INTERVAL_MINUTES = 10;
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

async function tick(): Promise<void> {
  const delayHours = Number(process.env.REVIEW_REQUEST_DELAY_HOURS || DEFAULT_DELAY_HOURS);
  const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  try {
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
