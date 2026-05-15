// SMS webhooks (inbound + outbound) and admin endpoints for the conversation view.
//
// Twilio POSTs to /api/sms/incoming when ANY SMS lands at the client's Twilio number.
// We:
//   1. Verify the signature
//   2. Find or create the conversation
//   3. Persist the inbound message
//   4. Generate a reply (AI or template)
//   5. Send the reply via Twilio
//   6. Persist the outbound message

import { Router, type IRouter } from "express";
import express from "express";
import type { Request, Response } from "express";
import { db, smsConversationsTable, smsMessagesTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { sendSms, verifyTwilioSignature } from "../lib/twilio";
import { generateReply } from "../lib/sms-reply";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();
const urlEncoded = express.urlencoded({ extended: false });

function fullRequestUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  return `${proto}://${host}${req.originalUrl}`;
}

function isAuthorizedTwilio(req: Request): boolean {
  if (process.env.SKIP_TWILIO_SIGNATURE_VERIFY === "true") return true;
  const sig = req.header("x-twilio-signature");
  if (!sig) return false;
  return verifyTwilioSignature(fullRequestUrl(req), req.body as Record<string, unknown>, sig);
}

// POST /api/sms/incoming — Twilio webhook for inbound SMS
router.post("/sms/incoming", urlEncoded, async (req: Request, res: Response): Promise<void> => {
  if (!isAuthorizedTwilio(req)) {
    req.log?.warn("Inbound SMS webhook signature mismatch");
    res.status(403).send("Forbidden");
    return;
  }

  const callerPhone = String(req.body.From || "");
  const twilioNumber = String(req.body.To || "");
  const messageBody = String(req.body.Body || "");
  const inboundSid = String(req.body.MessageSid || "");

  // Respond to Twilio FAST so the webhook doesn't time out (Twilio's 15s limit).
  // We process the reply asynchronously below.
  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);

  if (!callerPhone || !twilioNumber || !messageBody) {
    req.log?.warn({ callerPhone, twilioNumber, body: messageBody }, "incoming SMS missing fields");
    return;
  }

  const log = req.log;
  handleInboundSms(callerPhone, twilioNumber, messageBody, inboundSid, log).catch((err) =>
    log?.error({ err: err instanceof Error ? err.message : err }, "inbound SMS handler failed"),
  );
});

async function handleInboundSms(
  callerPhone: string,
  twilioNumber: string,
  messageBody: string,
  inboundSid: string,
  logger: Request["log"] | undefined,
): Promise<void> {
  // Find or create conversation
  const existing = await db
    .select()
    .from(smsConversationsTable)
    .where(
      and(
        eq(smsConversationsTable.callerPhone, callerPhone),
        eq(smsConversationsTable.twilioNumber, twilioNumber),
      ),
    )
    .limit(1);

  let convId: number;
  if (existing.length > 0) {
    convId = existing[0].id;
    await db
      .update(smsConversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(smsConversationsTable.id, convId));
  } else {
    const [created] = await db
      .insert(smsConversationsTable)
      .values({ callerPhone, twilioNumber, trigger: "inbound_sms" })
      .returning({ id: smsConversationsTable.id });
    convId = created.id;
  }

  // Persist the inbound message
  await db.insert(smsMessagesTable).values({
    conversationId: convId,
    direction: "inbound",
    body: messageBody,
    twilioSid: inboundSid || null,
    status: "delivered",
  });

  // Load recent message history (chronological) for the reply context
  const recent = await db
    .select({
      direction: smsMessagesTable.direction,
      body: smsMessagesTable.body,
    })
    .from(smsMessagesTable)
    .where(eq(smsMessagesTable.conversationId, convId))
    .orderBy(asc(smsMessagesTable.createdAt))
    .limit(20);

  const businessName = process.env.BUSINESS_NAME || "us";
  const businessTrade = process.env.BUSINESS_TRADE || "service";
  const businessLocation = process.env.BUSINESS_LOCATION || "";
  const businessPhone = process.env.BUSINESS_PHONE || twilioNumber;

  const reply = await generateReply(
    {
      business: {
        name: businessName,
        trade: businessTrade,
        location: businessLocation,
        phone: businessPhone,
      },
      conversationHistory: recent.map((m) => ({
        direction: m.direction as "inbound" | "outbound",
        body: m.body,
      })),
      latestInbound: messageBody,
    },
    logger,
  );

  const sendResult = await sendSms({ to: callerPhone, body: reply.text, from: twilioNumber });

  await db.insert(smsMessagesTable).values({
    conversationId: convId,
    direction: "outbound",
    body: reply.text,
    twilioSid: sendResult.sid,
    source: reply.source,
    status: sendResult.ok ? "sent" : "failed",
  });

  logger?.info(
    { convId, callerPhone, source: reply.source, sendOk: sendResult.ok },
    "Inbound SMS handled",
  );
}

// ====== Admin endpoints (for the future CRM SMS tab) ======

// GET /api/admin/sms/conversations — list all conversations, newest first
router.get(
  "/admin/sms/conversations",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(smsConversationsTable)
      .orderBy(desc(smsConversationsTable.updatedAt))
      .limit(200);
    res.json(rows);
  },
);

// GET /api/admin/sms/conversations/:id/messages — full message log for one convo
router.get(
  "/admin/sms/conversations/:id/messages",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select()
      .from(smsMessagesTable)
      .where(eq(smsMessagesTable.conversationId, id))
      .orderBy(asc(smsMessagesTable.createdAt));
    res.json(rows);
  },
);

// POST /api/admin/sms/conversations/:id/reply — admin manually sends a reply
// (overrides AI; useful when an admin wants to step in)
router.post(
  "/admin/sms/conversations/:id/reply",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const { body } = req.body as { body?: string };
    if (!body || typeof body !== "string" || body.trim().length === 0) {
      res.status(400).json({ error: "body is required" });
      return;
    }

    const [conv] = await db
      .select()
      .from(smsConversationsTable)
      .where(eq(smsConversationsTable.id, id))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const sendResult = await sendSms({
      to: conv.callerPhone,
      body: body.trim(),
      from: conv.twilioNumber,
    });

    const [inserted] = await db
      .insert(smsMessagesTable)
      .values({
        conversationId: id,
        direction: "outbound",
        body: body.trim(),
        twilioSid: sendResult.sid,
        source: "human",
        status: sendResult.ok ? "sent" : "failed",
      })
      .returning();

    if (!sendResult.ok) {
      res.status(502).json({ error: sendResult.error || "Twilio send failed", message: inserted });
      return;
    }
    res.status(201).json({ message: inserted });
  },
);

export default router;
