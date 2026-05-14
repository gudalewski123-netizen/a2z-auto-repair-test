import { Router, type IRouter } from "express";
import { db, siteChangeRequestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { Request, Response } from "express";

const NOTIFY_EMAIL = "info@thetradestack.net";
const FORMSUBMIT_URL = `https://formsubmit.co/ajax/${NOTIFY_EMAIL}`;

async function notifyByEmail(request: {
  id: number;
  requestType: string;
  businessName: string | null;
  phone: string | null;
  aboutText: string | null;
  servicesText: string | null;
  pricingNotes: string | null;
  photoNotes: string | null;
  promptText: string | null;
}, user: { email: string; businessName: string }) {
  try {
    let message = "";

    if (request.requestType === "structured") {
      const fields: string[] = [];
      if (request.businessName) fields.push(`Business Name: ${request.businessName}`);
      if (request.phone)        fields.push(`Phone: ${request.phone}`);
      if (request.aboutText)    fields.push(`\nAbout Section:\n${request.aboutText}`);
      if (request.servicesText) fields.push(`\nServices:\n${request.servicesText}`);
      if (request.pricingNotes) fields.push(`\nPricing Notes:\n${request.pricingNotes}`);
      if (request.photoNotes)   fields.push(`\nPhoto Instructions:\n${request.photoNotes}`);
      message = fields.join("\n");
    } else {
      message = request.promptText ?? "";
    }

    const subject =
      request.requestType === "structured"
        ? `[Portal] Quick Update Request from ${user.businessName}`
        : `[Portal] Custom Request from ${user.businessName}`;

    const body =
      `Client: ${user.businessName} (${user.email})\n` +
      `Request ID: #${request.id}\n` +
      `Type: ${request.requestType === "structured" ? "Quick Update" : "Custom Request"}\n\n` +
      `---\n\n${message}`;

    const fsRes = await fetch(FORMSUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: "https://waterstonedigital.replit.app/",
        Origin: "https://waterstonedigital.replit.app",
      },
      body: JSON.stringify({ subject, message: body }),
    });
    const fsData = await fsRes.json().catch(() => ({}));
    if (fsData.success !== "true") {
      throw new Error(`FormSubmit rejected: ${JSON.stringify(fsData)}`);
    }
  } catch (err) {
    // Log but don't fail — request is already saved in DB
    console.error("[email] FormSubmit notification failed:", err);
  }
}

const router: IRouter = Router();

router.get("/portal/requests", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const requests = await db
    .select()
    .from(siteChangeRequestsTable)
    .where(eq(siteChangeRequestsTable.userId, user.userId))
    .orderBy(desc(siteChangeRequestsTable.createdAt));
  res.json(requests);
});

router.post("/portal/requests", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { requestType, businessName, phone, aboutText, servicesText, pricingNotes, photoNotes, promptText } = req.body;

  if (!requestType || !["structured", "custom"].includes(requestType)) {
    res.status(400).json({ error: "Invalid request type" });
    return;
  }

  if (requestType === "custom" && !promptText) {
    res.status(400).json({ error: "Prompt text is required for custom requests" });
    return;
  }

  const [request] = await db.insert(siteChangeRequestsTable).values({
    userId: user.userId,
    requestType,
    businessName: businessName ?? null,
    phone: phone ?? null,
    aboutText: aboutText ?? null,
    servicesText: servicesText ?? null,
    pricingNotes: pricingNotes ?? null,
    photoNotes: photoNotes ?? null,
    promptText: promptText ?? null,
  }).returning();

  req.log.info({ requestId: request.id, userId: user.userId }, "Change request submitted");

  // Fire-and-forget email notification via FormSubmit.co
  notifyByEmail(request, user);

  res.status(201).json(request);
});

export default router;
