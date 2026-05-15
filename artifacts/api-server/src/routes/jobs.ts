import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, jobsTable, contactsTable, activitiesTable } from "@workspace/db";
import {
  ListJobsParams,
  ListJobsResponse,
  CreateJobParams,
  CreateJobBody,
  UpdateJobParams,
  UpdateJobBody,
  UpdateJobResponse,
  DeleteJobParams,
} from "@workspace/api-zod";
import { sendReviewRequest } from "../lib/review-request";

const router: IRouter = Router();

async function recalcRevenue(contactId: number, userId: number) {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${jobsTable.price}), 0)` })
    .from(jobsTable)
    .where(and(eq(jobsTable.contactId, contactId), eq(jobsTable.userId, userId)));
  await db
    .update(contactsTable)
    .set({ totalRevenue: result[0].total })
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.userId, userId)));
}

async function verifyContactOwnership(contactId: number, userId: number): Promise<boolean> {
  const [contact] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.userId, userId)));
  return !!contact;
}

router.get("/contacts/:contactId/jobs", async (req, res): Promise<void> => {
  const params = ListJobsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.contactId, params.data.contactId), eq(jobsTable.userId, req.userId!)))
    .orderBy(jobsTable.createdAt);

  const result = jobs.map((j) => ({ ...j, price: Number(j.price) }));
  res.json(ListJobsResponse.parse(result));
});

router.post("/contacts/:contactId/jobs", async (req, res): Promise<void> => {
  const params = CreateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await verifyContactOwnership(params.data.contactId, req.userId!))) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [job] = await db
    .insert(jobsTable)
    .values({
      userId: req.userId!,
      contactId: params.data.contactId,
      serviceType: parsed.data.serviceType,
      price: String(parsed.data.price),
      date: parsed.data.date != null ? new Date(parsed.data.date).toISOString() : null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  await recalcRevenue(params.data.contactId, req.userId!);

  await db.insert(activitiesTable).values({
    userId: req.userId!,
    contactId: params.data.contactId,
    action: "job_added",
    details: `Job added: ${parsed.data.serviceType} - $${parsed.data.price}`,
  });

  res.status(201).json({ ...job, price: Number(job.price) });
});

router.patch("/contacts/:contactId/jobs/:id", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.serviceType !== undefined) updateData.serviceType = parsed.data.serviceType;
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  if (parsed.data.date !== undefined) updateData.date = parsed.data.date != null ? new Date(parsed.data.date).toISOString() : null;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [job] = await db
    .update(jobsTable)
    .set(updateData)
    .where(and(eq(jobsTable.id, params.data.id), eq(jobsTable.contactId, params.data.contactId), eq(jobsTable.userId, req.userId!)))
    .returning();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  await recalcRevenue(params.data.contactId, req.userId!);
  res.json(UpdateJobResponse.parse({ ...job, price: Number(job.price) }));
});

// POST /api/contacts/:contactId/jobs/:id/complete
//
// Marks a job complete and (Phase 2C) fires off a review-request SMS to the
// customer. Idempotent on completedAt — calling twice doesn't change the
// timestamp. Idempotent on review-request — the second call returns
// reason: "already_sent" and does NOT double-send the SMS.
//
// Body (all optional):
//   { sendReviewRequest: false }  to mark complete WITHOUT texting
router.post("/contacts/:contactId/jobs/:id/complete", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const shouldSend = req.body?.sendReviewRequest !== false; // default true

  const [row] = await db
    .select({ job: jobsTable, contact: contactsTable })
    .from(jobsTable)
    .innerJoin(contactsTable, eq(contactsTable.id, jobsTable.contactId))
    .where(
      and(
        eq(jobsTable.id, params.data.id),
        eq(jobsTable.contactId, params.data.contactId),
        eq(jobsTable.userId, req.userId!),
      ),
    );

  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const wasAlreadyComplete = row.job.completedAt != null;
  if (!wasAlreadyComplete) {
    await db.update(jobsTable).set({ completedAt: new Date() }).where(eq(jobsTable.id, row.job.id));
    await db.insert(activitiesTable).values({
      userId: req.userId!,
      contactId: row.job.contactId,
      action: "job_completed",
      details: `Job marked complete: ${row.job.serviceType}`,
    });
  }

  const completedAtIso =
    (row.job.completedAt ?? new Date()).toISOString();

  if (!shouldSend) {
    res.json({ ok: true, completedAt: completedAtIso, reviewRequestSent: false, reason: "skipped_by_caller" });
    return;
  }

  if (row.job.reviewRequestSentAt != null) {
    res.json({
      ok: true,
      completedAt: completedAtIso,
      reviewRequestSent: false,
      reason: "already_sent",
      sentAt: row.job.reviewRequestSentAt.toISOString(),
    });
    return;
  }

  const result = await sendReviewRequest(
    {
      customerName: row.contact.name,
      customerPhone: row.contact.phone,
      serviceType: row.job.serviceType,
      twilioNumber: process.env.TWILIO_PHONE_NUMBER || "",
      businessName: process.env.BUSINESS_NAME || "us",
      reviewUrl: process.env.REVIEW_REQUEST_URL || "",
    },
    req.log,
  );

  if (!result.ok) {
    req.log?.warn({ jobId: row.job.id, err: result.error }, "Review-request SMS send failed");
    res.json({
      ok: true,
      completedAt: completedAtIso,
      reviewRequestSent: false,
      reason: result.error || "send_failed",
      conversationId: result.conversationId,
    });
    return;
  }

  await db.update(jobsTable).set({ reviewRequestSentAt: new Date() }).where(eq(jobsTable.id, row.job.id));

  res.json({
    ok: true,
    completedAt: completedAtIso,
    reviewRequestSent: true,
    source: result.source,
    conversationId: result.conversationId,
    messageId: result.messageId,
  });
});

// POST /api/contacts/:contactId/jobs/:id/resend-review-request
// Force a fresh review-request even if one was already sent. Useful when the
// initial send failed delivery or the admin wants to nudge again.
router.post("/contacts/:contactId/jobs/:id/resend-review-request", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ job: jobsTable, contact: contactsTable })
    .from(jobsTable)
    .innerJoin(contactsTable, eq(contactsTable.id, jobsTable.contactId))
    .where(
      and(
        eq(jobsTable.id, params.data.id),
        eq(jobsTable.contactId, params.data.contactId),
        eq(jobsTable.userId, req.userId!),
      ),
    );

  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const result = await sendReviewRequest(
    {
      customerName: row.contact.name,
      customerPhone: row.contact.phone,
      serviceType: row.job.serviceType,
      twilioNumber: process.env.TWILIO_PHONE_NUMBER || "",
      businessName: process.env.BUSINESS_NAME || "us",
      reviewUrl: process.env.REVIEW_REQUEST_URL || "",
    },
    req.log,
  );

  if (!result.ok) {
    res.status(502).json({ ok: false, error: result.error, conversationId: result.conversationId });
    return;
  }

  await db.update(jobsTable).set({ reviewRequestSentAt: new Date() }).where(eq(jobsTable.id, row.job.id));

  res.json({
    ok: true,
    reviewRequestSent: true,
    source: result.source,
    conversationId: result.conversationId,
    messageId: result.messageId,
  });
});

router.delete("/contacts/:contactId/jobs/:id", async (req, res): Promise<void> => {
  const params = DeleteJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db
    .delete(jobsTable)
    .where(and(eq(jobsTable.id, params.data.id), eq(jobsTable.contactId, params.data.contactId), eq(jobsTable.userId, req.userId!)))
    .returning();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  await recalcRevenue(params.data.contactId, req.userId!);
  res.sendStatus(204);
});

export default router;
