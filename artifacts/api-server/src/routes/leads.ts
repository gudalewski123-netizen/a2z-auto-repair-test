import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, contactsTable, activitiesTable } from "@workspace/db";
import { SubmitLeadBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = SubmitLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [];
  conditions.push(eq(contactsTable.phone, parsed.data.phone));
  if (parsed.data.email) {
    conditions.push(eq(contactsTable.email, parsed.data.email));
  }

  const [existing] = await db
    .select()
    .from(contactsTable)
    .where(or(...conditions))
    .limit(1);

  let contactId: number;

  if (existing) {
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.email) updateData.email = parsed.data.email;
    if (parsed.data.serviceRequested) updateData.serviceRequested = parsed.data.serviceRequested;
    if (parsed.data.notes) updateData.notes = parsed.data.notes;

    await db
      .update(contactsTable)
      .set(updateData)
      .where(eq(contactsTable.id, existing.id));

    contactId = existing.id;

    await db.insert(activitiesTable).values({
      contactId,
      action: "lead_resubmitted",
      details: `Lead form resubmitted. Service: ${parsed.data.serviceRequested ?? "not specified"}`,
    });
  } else {
    const [contact] = await db
      .insert(contactsTable)
      .values({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        status: "new_lead",
        source: parsed.data.source ?? "website",
        serviceRequested: parsed.data.serviceRequested ?? null,
        notes: parsed.data.notes ?? null,
        tags: [],
      })
      .returning();

    contactId = contact.id;

    await db.insert(activitiesTable).values({
      contactId,
      action: "lead_submitted",
      details: `New lead from ${parsed.data.source ?? "website"}. Service: ${parsed.data.serviceRequested ?? "not specified"}`,
    });
  }

  res.status(201).json({
    success: true,
    message: "We received your request and will contact you shortly",
    contactId,
  });
});

export default router;
