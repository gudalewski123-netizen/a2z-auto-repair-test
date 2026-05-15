// Voice webhooks. Twilio POSTs here (form-urlencoded) when an incoming call
// hits the client's Twilio number, and again when the <Dial> verb completes.
//
// Required env vars per client:
//   PUBLIC_BASE_URL       — full https://...onrender.com base URL of THIS service
//   CLIENT_CELL_NUMBER    — the business owner's actual cell (E.164), where calls forward
//   BUSINESS_NAME         — used in the missed-call SMS body
//   BUSINESS_TRADE        — used in the missed-call SMS body
//   BUSINESS_LOCATION     — used in the missed-call SMS body
//   TWILIO_ACCOUNT_SID    — for the Twilio adapter
//   TWILIO_AUTH_TOKEN     — for signature verification + the Twilio adapter

import { Router, type IRouter } from "express";
import express from "express";
import type { Request, Response } from "express";
import { db, smsConversationsTable, smsMessagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendSms, verifyTwilioSignature } from "../lib/twilio";
import { generateReply } from "../lib/sms-reply";

const router: IRouter = Router();
const urlEncoded = express.urlencoded({ extended: false });

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function fullRequestUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  return `${proto}://${host}${req.originalUrl}`;
}

function isAuthorizedTwilio(req: Request): boolean {
  // Allow disabling verification via env for local dev
  if (process.env.SKIP_TWILIO_SIGNATURE_VERIFY === "true") return true;
  const sig = req.header("x-twilio-signature");
  if (!sig) return false;
  return verifyTwilioSignature(fullRequestUrl(req), req.body as Record<string, unknown>, sig);
}

// POST /api/voice/incoming
// Twilio webhooks here when an incoming call arrives at the client's Twilio number.
// We answer, dial the client's actual cell, and if no answer in 30s → trigger missed-call SMS.
router.post("/voice/incoming", urlEncoded, async (req: Request, res: Response): Promise<void> => {
  if (!isAuthorizedTwilio(req)) {
    req.log?.warn("Voice webhook signature mismatch");
    res.status(403).send("Forbidden");
    return;
  }

  const callerPhone = String(req.body.From || "");
  const calledNumber = String(req.body.To || "");
  const clientCell = process.env.CLIENT_CELL_NUMBER;
  const baseUrl = process.env.PUBLIC_BASE_URL || "";

  req.log?.info({ callerPhone, calledNumber }, "Incoming call");

  // No client cell configured — go straight to SMS fallback path
  if (!clientCell) {
    res.type("text/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response>` +
        `<Say voice="alice">Sorry, our team is unavailable right now. We'll text you back shortly.</Say>` +
        `<Hangup/>` +
      `</Response>`,
    );
    handleMissedCall(callerPhone, calledNumber, req.log).catch((err) =>
      req.log?.error({ err: err instanceof Error ? err.message : err }, "missed-call handler failed"),
    );
    return;
  }

  const missedCallUrl = `${baseUrl}/api/voice/missed-call`;
  res.type("text/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
      `<Dial timeout="30" answerOnBridge="true" action="${escapeXml(missedCallUrl)}" method="POST">` +
        escapeXml(clientCell) +
      `</Dial>` +
    `</Response>`,
  );
});

// POST /api/voice/missed-call
// Twilio fires this AFTER the <Dial> verb completes.
// DialCallStatus values: "completed" | "busy" | "no-answer" | "failed" | "canceled"
router.post("/voice/missed-call", urlEncoded, async (req: Request, res: Response): Promise<void> => {
  if (!isAuthorizedTwilio(req)) {
    req.log?.warn("missed-call webhook signature mismatch");
    res.status(403).send("Forbidden");
    return;
  }

  const dialStatus = String(req.body.DialCallStatus || "");
  const callerPhone = String(req.body.From || "");
  const calledNumber = String(req.body.To || "");

  req.log?.info({ dialStatus, callerPhone }, "Voice missed-call webhook");

  // Always respond with a clean hangup TwiML
  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);

  // If the call was answered, no SMS needed
  if (dialStatus === "completed") {
    req.log?.info("Call was answered; no missed-call SMS sent");
    return;
  }

  // Anything else (busy/no-answer/failed/canceled) → missed → text the caller
  handleMissedCall(callerPhone, calledNumber, req.log).catch((err) =>
    req.log?.error({ err: err instanceof Error ? err.message : err }, "missed-call handler failed"),
  );
});

async function handleMissedCall(
  callerPhone: string,
  twilioNumber: string,
  logger: Request["log"] | undefined,
): Promise<void> {
  if (!callerPhone || !twilioNumber) {
    logger?.warn({ callerPhone, twilioNumber }, "missed-call missing phone numbers; aborting");
    return;
  }

  const businessName = process.env.BUSINESS_NAME || "us";
  const businessTrade = process.env.BUSINESS_TRADE || "service";
  const businessLocation = process.env.BUSINESS_LOCATION || "";
  const businessPhone = process.env.BUSINESS_PHONE || twilioNumber;

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
      .values({ callerPhone, twilioNumber, trigger: "missed_call" })
      .returning({ id: smsConversationsTable.id });
    convId = created.id;
  }

  // Generate the missed-call SMS (uses AI if configured, else template)
  const reply = await generateReply(
    {
      business: {
        name: businessName,
        trade: businessTrade,
        location: businessLocation,
        phone: businessPhone,
      },
      conversationHistory: [],
      latestInbound: "[missed call]",
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
    { to: callerPhone, sid: sendResult.sid, source: reply.source, ok: sendResult.ok },
    "Missed-call SMS",
  );
}

export default router;
