import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { usersTable } from "./users";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  date: text("date"),
  notes: text("notes"),
  // The Cal.com booking UID — populated when this job was created from an AI
  // SMS booking. Lets us find the right job on reschedule/cancel without
  // searching by contact + date heuristics. Null for jobs entered by the
  // admin directly in the CRM (those have no Cal.com counterpart).
  calBookingUid: text("cal_booking_uid"),
  // Set when an admin marks the job complete (POST /jobs/:id/complete).
  // Triggers the review-request SMS flow (Phase 2C).
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // Set when the review-request SMS has been sent so we don't duplicate.
  // Cleared by POST /jobs/:id/resend-review-request if admin needs to retry.
  reviewRequestSentAt: timestamp("review_request_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
