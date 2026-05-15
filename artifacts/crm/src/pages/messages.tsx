// Messages inbox — view AI ↔ customer SMS threads.
//
// Two-column layout:
//   - Left: list of all conversations, newest first
//   - Right: full message thread of the selected conversation, with reply box
//
// Polls every 15s so new messages show up without manual refresh.
// Admin can also type a reply that gets sent via Twilio (bypassing the AI
// for cases where they want to step in manually).

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Bot, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Conversation = {
  id: number;
  createdAt: string;
  updatedAt: string;
  callerPhone: string;
  twilioNumber: string;
  trigger: string;
  status: string;
  aiSummary: string | null;
  lastBookingScheduledAt: string | null;
};

type Message = {
  id: number;
  createdAt: string;
  conversationId: number;
  direction: "inbound" | "outbound";
  body: string;
  twilioSid: string | null;
  source: "ai" | "template" | "human" | null;
  status: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  qualified: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  booked: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  dead: "bg-red-500/15 text-red-700 dark:text-red-300",
};

function formatPhone(e164: string): string {
  // Quick US-friendly formatter — falls back to the raw string for non-US
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

export default function Messages() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();

  // Conversations list — poll every 15s for new messages
  const { data: conversations, isLoading: convosLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/admin/sms/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sms/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load conversations");
      return res.json();
    },
    refetchInterval: 15_000,
  });

  // Auto-select first conversation on initial load
  useEffect(() => {
    if (selectedId === null && conversations && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Messages for the selected conversation
  const { data: messages, isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["/api/admin/sms/conversations", selectedId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/sms/conversations/${selectedId}/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: selectedId !== null,
    refetchInterval: 15_000,
  });

  const sendReply = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/admin/sms/conversations/${selectedId}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Send failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/conversations", selectedId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/conversations"] });
    },
  });

  const selectedConvo = useMemo(
    () => conversations?.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          SMS threads between the AI and your customers. Reply manually to step in.
        </p>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation list */}
        <div className="w-80 border rounded-lg flex flex-col bg-card overflow-hidden">
          <div className="p-3 border-b">
            <h2 className="font-semibold text-sm">Conversations</h2>
            {conversations && (
              <p className="text-xs text-muted-foreground">{conversations.length} total</p>
            )}
          </div>
          <ScrollArea className="flex-1">
            {convosLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : conversations && conversations.length > 0 ? (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 border-b hover:bg-accent transition-colors ${
                    selectedId === c.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{formatPhone(c.callerPhone)}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[c.status] || ""}`} variant="secondary">
                      {c.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between gap-2">
                    <span className="truncate">{c.trigger.replace(/_/g, " ")}</span>
                    <span className="shrink-0">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}</span>
                  </div>
                  {c.aiSummary && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.aiSummary}</div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No conversations yet. They'll appear when customers text your Twilio number.
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Thread view */}
        <div className="flex-1 border rounded-lg flex flex-col bg-card overflow-hidden">
          {selectedConvo ? (
            <>
              <div className="p-3 border-b flex items-center justify-between">
                <div>
                  <div className="font-semibold">{formatPhone(selectedConvo.callerPhone)}</div>
                  <div className="text-xs text-muted-foreground">
                    via {formatPhone(selectedConvo.twilioNumber)} · {selectedConvo.trigger.replace(/_/g, " ")} ·
                    started {format(new Date(selectedConvo.createdAt), "MMM d, h:mm a")}
                  </div>
                </div>
                <Badge className={STATUS_COLORS[selectedConvo.status] || ""} variant="secondary">
                  {selectedConvo.status}
                </Badge>
              </div>

              <ScrollArea className="flex-1 p-4">
                {msgsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading messages…</div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <MessageBubble key={m.id} message={m} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No messages yet.</div>
                )}
              </ScrollArea>

              <div className="p-3 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim().length === 0) return;
                    sendReply.mutate(draft.trim());
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Type a reply to send manually…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={sendReply.isPending}
                    maxLength={320}
                  />
                  <Button type="submit" disabled={sendReply.isPending || draft.trim().length === 0}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </form>
                {sendReply.isError && (
                  <p className="text-xs text-red-600 mt-2">
                    Failed: {sendReply.error instanceof Error ? sendReply.error.message : "unknown error"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Sending a manual reply goes out from your Twilio number. The AI will resume on the next inbound message.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              {convosLoading ? "Loading…" : "Select a conversation"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";
  const isHuman = message.source === "human";

  return (
    <div className={`flex gap-2 ${isOutbound ? "justify-end" : "justify-start"}`}>
      {!isOutbound && (
        <div className="shrink-0 mt-1 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
          <UserIcon className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={`max-w-[70%] rounded-2xl px-3 py-2 ${
          isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <div
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          <span>{format(new Date(message.createdAt), "MMM d, h:mm a")}</span>
          {isOutbound && message.source && (
            <>
              <span>·</span>
              <span className="capitalize">{isHuman ? "you" : message.source}</span>
            </>
          )}
          {message.status === "failed" && (
            <>
              <span>·</span>
              <span className="text-red-300">failed</span>
            </>
          )}
        </div>
      </div>
      {isOutbound && (
        <div
          className={`shrink-0 mt-1 w-6 h-6 rounded-full flex items-center justify-center ${
            isHuman ? "bg-emerald-500/20" : "bg-primary/20"
          }`}
        >
          {isHuman ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
        </div>
      )}
    </div>
  );
}
