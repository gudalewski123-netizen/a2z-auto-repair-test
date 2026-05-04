import { Router, type IRouter } from "express";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { db, contactsTable, activitiesTable, jobsTable } from "@workspace/db";
import {
  ListContactsQueryParams,
  ListContactsResponse,
  CreateContactBody,
  GetContactParams,
  GetContactResponse,
  UpdateContactParams,
  UpdateContactBody,
  UpdateContactResponse,
  DeleteContactParams,
  UpdateContactStatusParams,
  UpdateContactStatusBody,
  UpdateContactStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contacts", async (req, res): Promise<void> => {
  const params = ListContactsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.status) {
    conditions.push(eq(contactsTable.status, params.data.status));
  }
  if (params.data.source) {
    conditions.push(eq(contactsTable.source, params.data.source));
  }
  if (params.data.search) {
    const search = `%${params.data.search}%`;
    conditions.push(
      or(
        ilike(contactsTable.name, search),
        ilike(contactsTable.phone, search),
        ilike(contactsTable.email, search)
      )
    );
  }
  if (params.data.tag) {
    conditions.push(sql`${params.data.tag} = ANY(${contactsTable.tags})`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const contacts = await db
    .select()
    .from(contactsTable)
    .where(where)
    .orderBy(contactsTable.createdAt);

  const result = contacts.map((c) => ({
    ...c,
    totalRevenue: Number(c.totalRevenue),
  }));
  res.json(ListContactsResponse.parse(result));
});

router.post("/contacts", async (req, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [contact] = await db
    .insert(contactsTable)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      status: parsed.data.status ?? "new_lead",
      source: parsed.data.source ?? "website",
      serviceRequested: parsed.data.serviceRequested ?? null,
      notes: parsed.data.notes ?? null,
      tags: parsed.data.tags ?? [],
    })
    .returning();

  await db.insert(activitiesTable).values({
    contactId: contact.id,
    action: "created",
    details: "Contact created",
  });

  res.status(201).json(GetContactResponse.parse({ ...contact, totalRevenue: Number(contact.totalRevenue) }));
});

router.get("/contacts/export", async (_req, res): Promise<void> => {
  const contacts = await db.select().from(contactsTable).orderBy(contactsTable.createdAt);
  const headers = ["ID", "Name", "Phone", "Email", "Status", "Source", "Service Requested", "Notes", "Tags", "Total Revenue", "Created At"];
  const rows = contacts.map((c) => [
    c.id,
    c.name,
    c.phone,
    c.email ?? "",
    c.status,
    c.source,
    c.serviceRequested ?? "",
    (c.notes ?? "").replace(/"/g, '""'),
    (c.tags ?? []).join(";"),
    c.totalRevenue,
    c.createdAt.toISOString(),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=contacts.csv");
  res.send(csv);
});

router.get("/contacts/:id", async (req, res): Promise<void> => {
  const params = GetContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, params.data.id));

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json(GetContactResponse.parse({ ...contact, totalRevenue: Number(contact.totalRevenue) }));
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const params = UpdateContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [contact] = await db
    .update(contactsTable)
    .set(parsed.data)
    .where(eq(contactsTable.id, params.data.id))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  await db.insert(activitiesTable).values({
    contactId: contact.id,
    action: "updated",
    details: "Contact info updated",
  });

  res.json(UpdateContactResponse.parse({ ...contact, totalRevenue: Number(contact.totalRevenue) }));
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const params = DeleteContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [contact] = await db
    .delete(contactsTable)
    .where(eq(contactsTable.id, params.data.id))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/contacts/:id/status", async (req, res): Promise<void> => {
  const params = UpdateContactStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateContactStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ status: contactsTable.status })
    .from(contactsTable)
    .where(eq(contactsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [contact] = await db
    .update(contactsTable)
    .set({ status: parsed.data.status })
    .where(eq(contactsTable.id, params.data.id))
    .returning();

  await db.insert(activitiesTable).values({
    contactId: contact.id,
    action: "status_changed",
    details: `Status changed from ${existing.status} to ${parsed.data.status}`,
  });

  res.json(UpdateContactStatusResponse.parse({ ...contact, totalRevenue: Number(contact.totalRevenue) }));
});

export default router;
