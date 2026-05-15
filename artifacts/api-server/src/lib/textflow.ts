// TextFlow adapter — forwards a captured lead to TextFlow's public leads endpoint.
//
// TextFlow's endpoint at https://textflow-website.replit.app/api/public/leads/<api-key>
// does TWO things on a successful POST:
//   1. Saves the lead to the client's TextFlow inbox
//   2. Automatically sends an outreach SMS to the lead via Twilio (using
//      the client's pre-configured TextFlow message template — typically
//      something like "Hi {name}, thanks for reaching out to {business}!
//      We do {trade} in {city}. When's a good time to call?")
//
// Setup per client:
//   - Client signs up for a TextFlow account
//   - Client configures their outreach message template in TextFlow's dashboard
//   - Client copies their unique webhook URL (with API key in path)
//   - That URL is set as TEXTFLOW_LEADS_WEBHOOK_URL on this client's Render service
//
// If TEXTFLOW_LEADS_WEBHOOK_URL is not set, this is a no-op (TextFlow not
// configured for this client — the lead is still saved to our DB and the
// frontend's FormSubmit path still emails the client).

interface TextFlowLeadPayload {
  name?: string;
  phone: string;        // E.164 or 10+ digit format — TextFlow validates
  email?: string;
  message?: string;
  // Template variables that TextFlow's outreach template can reference as
  // {business}, {trade}, {city}. Send them from the frontend so the SMS
  // looks branded for this specific client.
  business?: string;
  trade?: string;
  city?: string;
}

interface TextFlowResponse {
  ok: boolean;
  leadId?: number;
  outreach?: "sent" | "failed";
  reason?: string;
  message?: string;
}

interface PinoLikeLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * POSTs the lead to TextFlow. Bounded by a 5-second timeout so a slow/dead
 * TextFlow doesn't block the caller. Always resolves (never rejects) — the
 * caller should treat this as fire-and-forget signal-only.
 */
export async function forwardLeadToTextFlow(
  payload: TextFlowLeadPayload,
  logger?: PinoLikeLogger,
): Promise<{ skipped: true } | TextFlowResponse> {
  const webhookUrl = process.env.TEXTFLOW_LEADS_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.trim() === "") {
    logger?.info("TextFlow webhook not configured; skipping forward");
    return { skipped: true };
  }

  // Strip any whitespace + accidentally-included quotes from the env var.
  const url = webhookUrl.trim().replace(/^["']|["']$/g, "");

  const controller = new AbortController();
  const timeoutMs = 5000;
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutHandle);

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

    if (!res.ok) {
      logger?.warn({ status: res.status, body }, "TextFlow returned non-2xx");
      return { ok: false, message: `HTTP ${res.status}` };
    }

    if (typeof body === "object" && body !== null) {
      const tfResp = body as TextFlowResponse;
      logger?.info(
        { leadId: tfResp.leadId, outreach: tfResp.outreach, reason: tfResp.reason },
        "TextFlow forward succeeded",
      );
      return tfResp;
    }

    logger?.warn({ body }, "TextFlow returned 2xx but unexpected body shape");
    return { ok: true };
  } catch (err) {
    clearTimeout(timeoutHandle);
    const message = err instanceof Error ? err.message : "unknown error";
    if (controller.signal.aborted) {
      logger?.warn({ timeoutMs }, "TextFlow forward timed out");
      return { ok: false, message: "timeout" };
    }
    logger?.error({ err: message }, "TextFlow forward threw");
    return { ok: false, message };
  }
}
