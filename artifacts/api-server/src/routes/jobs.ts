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
