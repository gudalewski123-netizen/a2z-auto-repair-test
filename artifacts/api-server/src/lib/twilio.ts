// Twilio adapter — uses fetch + HTTP Basic auth (no Twilio SDK to keep deps light).
//
// Env vars consumed:
//   TWILIO_ACCOUNT_SID       — required
//   TWILIO_AUTH_TOKEN        — required
//   TWILIO_PHONE_NUMBER      — the client's dedicated Twilio number (E.164), default sender
//   TWILIO_MESSAGING_SERVICE_SID — optional; preferred over a raw From for A2P 10DLC compliance
//
// All inbound webhooks should be signature-verified via verifyTwilioSignature() to
// prevent forged requests from spoofing missed-call SMS or inbound replies.

import { createHmac } from "node:crypto";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

interface TwilioCreds {
  accountSid: string;
  authToken: string;
}

function getCreds(): TwilioCreds | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return { accountSid: sid, authToken: token };
}

function authHeader(creds: TwilioCreds): string {
  return "Basic " + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");
}

interface SendSmsParams {
  to: string;            // E.164 format (+1XXXXXXXXXX)
  body: string;
  from?: string;         // Falls back to TWILIO_PHONE_NUMBER env
}

export interface SendSmsResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

/**
 * Send an SMS via Twilio. Prefers Messaging Service SID (for A2P 10DLC compliance)
 * over a raw From number when TWILIO_MESSAGING_SERVICE_SID is configured.
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "Twilio creds not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)" };

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = params.from || process.env.TWILIO_PHONE_NUMBER;

  if (!messagingServiceSid && !fromNumber) {
    return { ok: false, error: "No sender configured: set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER" };
  }

  const formData = new URLSearchParams();
  formData.set("To", params.to);
  formData.set("Body", params.body);
  if (messagingServiceSid) {
    formData.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromNumber) {
    formData.set("From", fromNumber);
  }

  const url = `${TWILIO_API_BASE}/Accounts/${creds.accountSid}/Messages.json`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    const data = (await res.json()) as { sid?: string; message?: string; code?: number };
    if (!res.ok) {
      return { ok: false, error: data.message || `HTTP ${res.status}` };
    }
    return { ok: true, sid: data.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

/**
 * Verify a Twilio webhook signature.
 *
 * Twilio signs every webhook with X-Twilio-Signature: HMAC-SHA1, base64-encoded,
 * computed over (URL + sorted form params concatenated as key+value). The HMAC
 * key is the account auth token.
 *
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * @param fullUrl   The full URL Twilio sent the request to (proto + host + path + query)
 * @param params    The form-encoded body (req.body), as a flat object
 * @param signature The X-Twilio-Signature header value
 */
export function verifyTwilioSignature(
  fullUrl: string,
  params: Record<string, unknown>,
  signature: string,
): boolean {
  const creds = getCreds();
  if (!creds) return false;
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce((acc, k) => acc + k + String(params[k] ?? ""), fullUrl);
  const computed = createHmac("sha1", creds.authToken).update(data).digest("base64");
  // Constant-time compare to avoid timing attacks
  if (computed.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
