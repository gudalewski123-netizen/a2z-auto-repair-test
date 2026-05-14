import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, siteChangeRequestsTable, usersTable, adminUsersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  requireAdmin,
  signAdminSession,
  verifyAdminCredentials,
} from "../lib/auth";
import type { Request, Response } from "express";

const router: IRouter = Router();

router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const ok = await verifyAdminCredentials(username, password);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signAdminSession(username);
  res.json({ token, username });
});

router.get("/admin/me", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const username = (req as any).admin?.username ?? "";
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminUsersTable);
  res.json({ username, isDefault: count === 0 });
});

router.post("/admin/credentials", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newUsername, newPassword } = req.body ?? {};
  const currentUsername = (req as any).admin?.username ?? "";

  if (
    typeof currentPassword !== "string" ||
    typeof newUsername !== "string" ||
    typeof newPassword !== "string"
  ) {
    res.status(400).json({ error: "currentPassword, newUsername, and newPassword are required" });
    return;
  }

  const validCurrent = await verifyAdminCredentials(currentUsername, currentPassword);
  if (!validCurrent) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  if (newUsername.length < 3) {
    res.status(400).json({ error: "New username must be at least 3 characters" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.transaction(async (tx: typeof db) => {
    await tx.delete(adminUsersTable);
    await tx.insert(adminUsersTable).values({ username: newUsername, passwordHash });
  });

  res.json({ success: true, username: newUsername });
});

router.get("/admin/site-changes", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const requests = await db
    .select({
      id: siteChangeRequestsTable.id,
      userId: siteChangeRequestsTable.userId,
      userEmail: usersTable.email,
      userBusinessName: usersTable.businessName,
      requestType: siteChangeRequestsTable.requestType,
      businessName: siteChangeRequestsTable.businessName,
      phone: siteChangeRequestsTable.phone,
      aboutText: siteChangeRequestsTable.aboutText,
      servicesText: siteChangeRequestsTable.servicesText,
      pricingNotes: siteChangeRequestsTable.pricingNotes,
      photoNotes: siteChangeRequestsTable.photoNotes,
      promptText: siteChangeRequestsTable.promptText,
      status: siteChangeRequestsTable.status,
      adminNotes: siteChangeRequestsTable.adminNotes,
      createdAt: siteChangeRequestsTable.createdAt,
      updatedAt: siteChangeRequestsTable.updatedAt,
    })
    .from(siteChangeRequestsTable)
    .innerJoin(usersTable, eq(siteChangeRequestsTable.userId, usersTable.id))
    .orderBy(desc(siteChangeRequestsTable.createdAt));

  res.json(requests);
});

router.patch("/admin/site-changes/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { status, adminNotes } = req.body;
  const validStatuses = ["pending", "in_progress", "completed"];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (adminNotes != null) updates.adminNotes = adminNotes;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(siteChangeRequestsTable)
    .set(updates)
    .where(eq(siteChangeRequestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(updated);
});

export default router;
