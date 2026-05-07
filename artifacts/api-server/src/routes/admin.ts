import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, siteChangeRequestsTable } from "@workspace/db";

const router: IRouter = Router();

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";
if (!ADMIN_API_KEY) {
  throw new Error("ADMIN_API_KEY environment variable is required");
}

function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-api-key"];
  if (key !== ADMIN_API_KEY) {
    res.status(403).json({ error: "Invalid admin API key" });
    return;
  }
  next();
}

router.use("/admin", requireAdminKey);

router.post("/admin/users", async (req, res): Promise<void> => {
  const { email, password, businessName } = req.body;

  if (!email || !password || !businessName) {
    res.status(400).json({ error: "email, password, and businessName are required" });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      businessName: businessName.trim(),
    })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      businessName: usersTable.businessName,
      createdAt: usersTable.createdAt,
    });

  res.status(201).json(user);
});

router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      businessName: usersTable.businessName,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json(users);
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id });

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ success: true, deletedId: deleted.id });
});

router.patch("/admin/users/:id/password", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { password } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [updated] = await db
    .update(usersTable)
    .set({ password: hashedPassword })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, email: usersTable.email });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ success: true, id: updated.id, email: updated.email });
});

router.get("/admin/site-changes", async (_req, res): Promise<void> => {
  const requests = await db
    .select({
      id: siteChangeRequestsTable.id,
      userId: siteChangeRequestsTable.userId,
      requestType: siteChangeRequestsTable.requestType,
      businessName: siteChangeRequestsTable.businessName,
      phone: siteChangeRequestsTable.phone,
      aboutText: siteChangeRequestsTable.aboutText,
      servicesText: siteChangeRequestsTable.servicesText,
      photoNotes: siteChangeRequestsTable.photoNotes,
      pricingNotes: siteChangeRequestsTable.pricingNotes,
      promptText: siteChangeRequestsTable.promptText,
      status: siteChangeRequestsTable.status,
      adminNotes: siteChangeRequestsTable.adminNotes,
      createdAt: siteChangeRequestsTable.createdAt,
      userEmail: usersTable.email,
      businessNameUser: usersTable.businessName,
    })
    .from(siteChangeRequestsTable)
    .leftJoin(usersTable, eq(siteChangeRequestsTable.userId, usersTable.id))
    .orderBy(desc(siteChangeRequestsTable.createdAt));

  res.json(requests);
});

router.patch("/admin/site-changes/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { status, adminNotes } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const validStatuses = ["pending", "in_progress", "completed"];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [updated] = await db
    .update(siteChangeRequestsTable)
    .set({
      ...(status ? { status } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    })
    .where(eq(siteChangeRequestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(updated);
});

export default router;
