import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, siteChangeRequestsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/site-changes", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const {
    requestType,
    businessName,
    phone,
    aboutText,
    servicesText,
    photoNotes,
    pricingNotes,
    promptText,
  } = req.body;

  if (!requestType || !["structured", "prompt"].includes(requestType)) {
    res.status(400).json({ error: "requestType must be 'structured' or 'prompt'" });
    return;
  }

  const [created] = await db
    .insert(siteChangeRequestsTable)
    .values({
      userId,
      requestType,
      businessName: businessName ?? null,
      phone: phone ?? null,
      aboutText: aboutText ?? null,
      servicesText: servicesText ?? null,
      photoNotes: photoNotes ?? null,
      pricingNotes: pricingNotes ?? null,
      promptText: promptText ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(created);
});

router.get("/site-changes", async (req, res): Promise<void> => {
  const userId = req.userId!;

  const requests = await db
    .select()
    .from(siteChangeRequestsTable)
    .where(eq(siteChangeRequestsTable.userId, userId))
    .orderBy(desc(siteChangeRequestsTable.createdAt));

  res.json(requests);
});

export default router;
