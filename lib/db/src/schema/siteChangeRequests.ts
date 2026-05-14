import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const siteChangeRequestsTable = pgTable("site_change_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  requestType: text("request_type", { enum: ["structured", "custom"] }).notNull(),
  businessName: text("business_name"),
  phone: text("phone"),
  aboutText: text("about_text"),
  servicesText: text("services_text"),
  pricingNotes: text("pricing_notes"),
  photoNotes: text("photo_notes"),
  promptText: text("prompt_text"),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSiteChangeRequestSchema = createInsertSchema(siteChangeRequestsTable).omit({
  id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true
});
export type InsertSiteChangeRequest = z.infer<typeof insertSiteChangeRequestSchema>;
export type SiteChangeRequest = typeof siteChangeRequestsTable.$inferSelect;
