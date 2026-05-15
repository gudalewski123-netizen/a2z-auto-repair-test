import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

// One conversation per (callerPhone, twilioNumber) pair. Tracks the back-and-forth
// between a missed-call caller (or anyone who texts the client's Twilio number)
// and our auto-reply system.
export const smsConversationsTable = pgTable("sms_conversations", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // The lead's phone (E.164 format from Twilio)
  callerPhone: text("caller_phone").notNull(),
  // The client's Twilio number that received the call/SMS (E.164)
  twilioNumber: text("twilio_number").notNull(),
  // What kicked off this conversation: "missed_call" | "inbound_sms" | "manual"
  trigger: varchar("trigger", { length: 20 }).notNull().default("inbound_sms"),
  // "open" | "qualified" | "booked" | "closed" | "dead"
  status: varchar("status", { length: 20 }).notNull().default("open"),
  // Lightweight summary the AI maintains so it doesn't have to reload the full history
  aiSummary: text("ai_summary"),
  // If the caller previously submitted the QuoteForm, link the existing leads row.
  leadId: integer("lead_id"),
  // Phase 2E — current Cal.com booking for this conversation, if any.
  // Set when AI calls book_appointment; cleared when AI calls cancel_appointment;
  // updated when AI calls reschedule_appointment. Lets the AI handle reschedule/
  // cancel requests without a separate "find my appointment" tool call.
  lastBookingUid: text("last_booking_uid"),
  lastBookingScheduledAt: timestamp("last_booking_scheduled_at", { withTimezone: true }),
});

export type SmsConversation = typeof smsConversationsTable.$inferSelect;
export type InsertSmsConversation = typeof smsConversationsTable.$inferInsert;
