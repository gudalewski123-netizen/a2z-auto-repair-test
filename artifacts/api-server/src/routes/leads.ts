import { Router, type IRouter } from "express";
import { db, leadsTable, insertLeadSchema } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import type { Request, Response } from "express";

const router: IRouter = Router();

// POST /api/leads — public. Called by the QuoteForm in parallel with FormSubmit.
// Saves the lead to the DB so the admin dashboard always shows it, even if
// FormSubmit is down or unactivated.
router.post("/leads", async (req: Request, res: Response): Promise<void> => {
  const parsed = insertLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }
  try {
    const [row] = await db.insert(leadsTable).values({
      ...parsed.data,
      email: parsed.data.email.toLowerCase().trim(),
      phone: parsed.data.phone.trim(),
      name: parsed.data.name.trim(),
    }).returning({ id: leadsTable.id });
    req.log?.info({ leadId: row.id }, "Lead saved");
    res.status(201).json({ id: row.id, ok: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to save lead");
    res.status(500).json({ error: "Failed to save lead" });
  }
});

// GET /api/admin/leads — admin. Lists all leads, newest first.
router.get("/admin/leads", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
  res.json(rows);
});

// PATCH /api/admin/leads/:id — admin. Update status and/or adminNotes.
router.patch("/admin/leads/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };
  const validStatuses = ["new", "contacted", "won", "lost"];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of ${validStatuses.join(", ")}` });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const [updated] = await db.update(leadsTable).set(updates).where(eq(leadsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json(updated);
});

// DELETE /api/admin/leads/:id — admin. Hard delete (use sparingly).
router.delete("/admin/leads/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(leadsTable).where(eq(leadsTable.id, id)).returning({ id: leadsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json({ ok: true });
});

// POST /api/admin/login — admin. Accepts { password } and returns { ok: true }
// IF the password matches ADMIN_PASSWORD. The frontend then stores the password
// in localStorage as the bearer token for subsequent requests.
router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ ok: true });
});

export default router;
