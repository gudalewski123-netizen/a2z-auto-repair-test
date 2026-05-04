import { Router, type IRouter } from "express";
import { eq, and, lt } from "drizzle-orm";
import { db, followUpsTable, contactsTable, activitiesTable } from "@workspace/db";
import {
  ListFollowUpsQueryParams,
  ListFollowUpsResponse,
  CreateFollowUpParams,
  CreateFollowUpBody,
  UpdateFollowUpParams,
  UpdateFollowUpBody,
  UpdateFollowUpResponse,
  DeleteFollowUpParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/followups", async (req, res): Promise<void> => {
  const params = ListFollowUpsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [eq(followUpsTable.userId, req.userId!)];
  if (params.data.status) {
    conditions.push(eq(followUpsTable.status, params.data.status));
  }
  if (params.data.overdue) {
    conditions.push(lt(followUpsTable.dueDate, new Date()));
    conditions.push(eq(followUpsTable.status, "pending"));
  }

  const where = and(...conditions);

  const followups = await db
    .select({
      id: followUpsTable.id,
      contactId: followUpsTable.contactId,
      contactName: contactsTable.name,
      dueDate: followUpsTable.dueDate,
      note: followUpsTable.note,
      status: followUpsTable.status,
      createdAt: followUpsTable.createdAt,
    })
    .from(followUpsTable)
    .leftJoin(contactsTable, eq(followUpsTable.contactId, contactsTable.id))
    .where(where)
    .orderBy(followUpsTable.dueDate);

  res.json(ListFollowUpsResponse.parse(followups));
});

router.post("/contacts/:contactId/followups", async (req, res): Promise<void> => {
  const params = CreateFollowUpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateFollowUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ownedContact] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, params.data.contactId), eq(contactsTable.userId, req.userId!)));
  if (!ownedContact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [followup] = await db
    .insert(followUpsTable)
    .values({
      userId: req.userId!,
      contactId: params.data.contactId,
      dueDate: new Date(parsed.data.dueDate),
      note: parsed.data.note ?? null,
    })
    .returning();

  const [contact] = await db
    .select({ name: contactsTable.name })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, params.data.contactId), eq(contactsTable.userId, req.userId!)));

  await db.insert(activitiesTable).values({
    userId: req.userId!,
    contactId: params.data.contactId,
    action: "followup_set",
    details: `Follow-up reminder set for ${new Date(parsed.data.dueDate).toLocaleDateString()}`,
  });

  res.status(201).json({ ...followup, contactName: contact?.name ?? null });
});

router.patch("/followups/:id", async (req, res): Promise<void> => {
  const params = UpdateFollowUpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFollowUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.dueDate !== undefined) updateData.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.note !== undefined) updateData.note = parsed.data.note;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [followup] = await db
    .update(followUpsTable)
    .set(updateData)
    .where(and(eq(followUpsTable.id, params.data.id), eq(followUpsTable.userId, req.userId!)))
    .returning();

  if (!followup) {
    res.status(404).json({ error: "Follow-up not found" });
    return;
  }

  const [contact] = await db
    .select({ name: contactsTable.name })
    .from(contactsTable)
    .where(eq(contactsTable.id, followup.contactId));

  if (parsed.data.status === "completed") {
    await db.insert(activitiesTable).values({
      userId: req.userId!,
      contactId: followup.contactId,
      action: "followup_completed",
      details: "Follow-up marked as completed",
    });
  }

  res.json(UpdateFollowUpResponse.parse({ ...followup, contactName: contact?.name ?? null }));
});

router.delete("/followups/:id", async (req, res): Promise<void> => {
  const params = DeleteFollowUpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [followup] = await db
    .delete(followUpsTable)
    .where(and(eq(followUpsTable.id, params.data.id), eq(followUpsTable.userId, req.userId!)))
    .returning();

  if (!followup) {
    res.status(404).json({ error: "Follow-up not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
