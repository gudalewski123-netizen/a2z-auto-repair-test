// SMS reply generator. Tries Anthropic Claude (if ANTHROPIC_API_KEY is set);
// otherwise falls back to a static template. Caller code is identical either
// way — the source field on the resulting SmsMessage records which path ran.
//
// The Anthropic integration uses raw fetch (no SDK) to keep the api-server
// dependency tree lean. We use the Messages API at /v1/messages.

interface BusinessContext {
  name: string;
  trade: string;
  location: string;
  phone: string;
}

export interface ReplyContext {
  business: BusinessContext;
  // Newest message LAST (chronological). Most recent inbound is also passed as
  // `latestInbound` for convenience.
  conversationHistory: Array<{ direction: "inbound" | "outbound"; body: string }>;
  latestInbound: string;
}

export interface ReplyResult {
  text: string;
  source: "ai" | "template";
}

interface PinoLikeLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const ANTHROPIC_MODEL = "claude-haiku-4-5"; // fast + cheap, good for SMS-length replies

/** Generate a reply. Falls back to template if Anthropic is unavailable or errors. */
export async function generateReply(ctx: ReplyContext, logger?: PinoLikeLogger): Promise<ReplyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const text = await generateWithClaude(ctx, apiKey, logger);
      if (text && text.trim().length > 0) {
        return { text: text.trim(), source: "ai" };
      }
      logger?.warn("AI returned empty reply; falling back to template");
    } catch (err) {
      logger?.warn({ err: err instanceof Error ? err.message : err }, "AI reply failed; falling back to template");
    }
  }
  return { text: templateReply(ctx), source: "template" };
}

function templateReply(ctx: ReplyContext): string {
  const isFirstReply =
    ctx.conversationHistory.filter((m) => m.direction === "outbound").length === 0;

  if (isFirstReply) {
    return `Hi! ${ctx.business.name} here — sorry we missed your call. We do ${ctx.business.trade} in ${ctx.business.location}. What can we help with?`;
  }
  return `Got it — thanks for the details. Someone from ${ctx.business.name} will follow up shortly. For anything urgent, call ${ctx.business.phone}.`;
}

async function generateWithClaude(
  ctx: ReplyContext,
  apiKey: string,
  logger?: PinoLikeLogger,
): Promise<string> {
  const systemPrompt = [
    `You are an SMS auto-reply assistant for ${ctx.business.name}, a ${ctx.business.trade} business in ${ctx.business.location}.`,
    `Your job: respond briefly to qualify the lead and move toward booking a callback or appointment.`,
    `Keep replies under 320 characters (SMS-friendly). Plain text. No markdown. No emoji unless the customer used one.`,
    `Ask one question at a time. Be friendly and direct — sound like a human, not a bot.`,
    `If they describe what they need, suggest a callback time ("Can someone call you at 2pm today?").`,
    `If they ask price, deflect to a callback: "We can give you an exact quote after a 5-min call — when's good?".`,
    `End every reply with: "— ${ctx.business.name}"`,
  ].join(" ");

  const messages = ctx.conversationHistory.slice(-8).map((m) => ({
    role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
    content: m.body,
  }));

  // If history is empty for some reason, seed with the latest inbound
  if (messages.length === 0) {
    messages.push({ role: "user", content: ctx.latestInbound });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const block = data.content?.find((c) => c.type === "text");
  return block?.text || "";
}
