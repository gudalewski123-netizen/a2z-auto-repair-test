import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

// Individual SMS messages within a conversation. Both inbound and outbound.
export const smsMessagesTable = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  conversationId: integer("conversation_id").notNull(),
  // "inbound" (caller → us) or "outbound" (us → caller)
  direction: varchar("direction", { length: 10 }).notNull(),
  body: text("body").notNull(),
  // Twilio Message SID. For outbound: returned by the Messages API.
  // For inbound: the SID Twilio gives us in the webhook payload (MessageSid).
  twilioSid: text("twilio_sid"),
  // For outbound only: how was this generated?  "ai" | "template" | "human"
  source: varchar("source", { length: 20 }),
  // Twilio delivery status (updated by status callback): "queued" | "sent" | "delivered" | "failed" | "undelivered"
  status: varchar("status", { length: 20 }),
});

export type SmsMessage = typeof smsMessagesTable.$inferSelect;
export type InsertSmsMessage = typeof smsMessagesTable.$inferInsert;
