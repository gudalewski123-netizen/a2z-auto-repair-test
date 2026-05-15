// CRM sync for AI-driven bookings.
//
// The AI SMS bot uses Cal.com directly for scheduling, but the dashboard's
// "Mark job complete → review-request SMS" flow (Phase 2C) only runs when
// there's a row in the `jobs` table. Without this module, AI bookings live
// in Cal.com but never reach the CRM, so admin can't complete them and the
// review SMS never fires.
//
// This module is the bridge:
//   - syncBookingCreated()    → upsert contact, insert job (with calBookingUid)
//   - syncBookingRescheduled()→ update the job's date
//   - syncBookingCancelled()  → delete the job
//
// Every sync requires a "tenant user" (a row in portal_users). In TIER-2's
// single-tenant deployment model, this is the business owner who registers
// via /auth/register. If no portal user exists yet, the sync is skipped
// with a warning — the Cal.com booking still works, but it won't appear in
// the CRM until someone registers.

import { db, contactsTable, jobsTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

interface PinoLikeLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Look up the tenant's portal user ID. Single-tenant deployment assumption:
 * the first row in portal_users is the business owner. Returns null if no
 * user has registered yet — caller should skip the sync gracefully.
 */
async function getTenantUserId(): Promise<number | null> {
  const [row] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  return row?.id ?? null;
}

async function upsertContactByPhone(args: {
  userId: number;
  phone: string;
  name: string;
  serviceType: string;
}): Promise<number> {
  const [existing] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.userId, args.userId), eq(contactsTable.phone, args.phone)))
    .limit(1);
  if (existing) {
    // Refresh name + service if the customer provided new info this conversation
    await db
      .update(contactsTable)
      .set({ name: args.name, serviceRequested: args.serviceType })
      .where(eq(contactsTable.id, existing.id));
    return existing.id;
  }
  const [created] = await db
    .insert(contactsTable)
    .values({
      userId: args.userId,
      name: args.name,
      phone: args.phone,
      status: "new_lead",
      source: "ai_sms",
      serviceRequested: args.serviceType,
    })
    .returning({ id: contactsTable.id });
  return created.id;
}

export async function syncBookingCreated(
  params: {
    calBookingUid: string;
    startIso: string;
    customerName: string;
    customerPhone: string;
    serviceType: string;
    notes?: string;
  },
  logger?: PinoLikeLogger,
): Promise<{ jobId?: number; contactId?: number; skipped?: string }> {
  const userId = await getTenantUserId();
  if (!userId) {
    logger?.warn(
      { calBookingUid: params.calBookingUid },
      "CRM sync skipped: no portal_users row. Register via /auth/register to enable review-request flow for AI bookings.",
    );
    return { skipped: "no_tenant_user" };
  }

  try {
    const contactId = await upsertContactByPhone({
      userId,
      phone: params.customerPhone,
      name: params.customerName,
      serviceType: params.serviceType,
    });

    const [job] = await db
      .insert(jobsTable)
      .values({
        userId,
        contactId,
        serviceType: params.serviceType,
        date: params.startIso,
        notes: params.notes || "Booked via SMS AI",
        calBookingUid: params.calBookingUid,
      })
      .returning({ id: jobsTable.id });

    logger?.info(
      { jobId: job.id, contactId, calBookingUid: params.calBookingUid },
      "CRM sync: job created from AI booking",
    );
    return { jobId: job.id, contactId };
  } catch (err) {
    logger?.warn(
      { err: err instanceof Error ? err.message : err, calBookingUid: params.calBookingUid },
      "CRM sync failed during booking-created (Cal.com booking still went through)",
    );
    return { skipped: "db_error" };
  }
}

export async function syncBookingRescheduled(
  params: { calBookingUid: string; newStartIso: string },
  logger?: PinoLikeLogger,
): Promise<{ updated?: boolean; skipped?: string }> {
  const userId = await getTenantUserId();
  if (!userId) return { skipped: "no_tenant_user" };

  try {
    const result = await db
      .update(jobsTable)
      .set({ date: params.newStartIso })
      .where(and(eq(jobsTable.userId, userId), eq(jobsTable.calBookingUid, params.calBookingUid)))
      .returning({ id: jobsTable.id });

    if (result.length === 0) {
      logger?.info(
        { calBookingUid: params.calBookingUid },
        "CRM sync: no matching job for reschedule (already deleted or never created)",
      );
      return { skipped: "not_found" };
    }
    logger?.info({ jobId: result[0].id }, "CRM sync: job rescheduled");
    return { updated: true };
  } catch (err) {
    logger?.warn({ err: err instanceof Error ? err.message : err }, "CRM sync failed during reschedule");
    return { skipped: "db_error" };
  }
}

export async function syncBookingCancelled(
  params: { calBookingUid: string },
  logger?: PinoLikeLogger,
): Promise<{ deleted?: boolean; skipped?: string }> {
  const userId = await getTenantUserId();
  if (!userId) return { skipped: "no_tenant_user" };

  try {
    const result = await db
      .delete(jobsTable)
      .where(and(eq(jobsTable.userId, userId), eq(jobsTable.calBookingUid, params.calBookingUid)))
      .returning({ id: jobsTable.id });

    if (result.length === 0) {
      return { skipped: "not_found" };
    }
    logger?.info({ jobId: result[0].id }, "CRM sync: job deleted (cancelled)");
    return { deleted: true };
  } catch (err) {
    logger?.warn({ err: err instanceof Error ? err.message : err }, "CRM sync failed during cancel");
    return { skipped: "db_error" };
  }
}
