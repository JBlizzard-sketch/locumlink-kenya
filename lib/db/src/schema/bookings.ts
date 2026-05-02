import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shiftsTable, shiftApplicationsTable } from "./shifts";
import { locumsTable } from "./locums";

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "checked_in",
  "completed",
  "disputed",
  "cancelled",
  "no_show",
]);

export const disputeTypeEnum = pgEnum("dispute_type", [
  "locum_no_show",
  "clinic_cancellation",
  "payment_dispute",
  "quality_complaint",
  "other",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "resolved",
  "escalated",
]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id")
    .notNull()
    .references(() => shiftsTable.id),
  locumId: integer("locum_id")
    .notNull()
    .references(() => locumsTable.id),
  applicationId: integer("application_id").references(
    () => shiftApplicationsTable.id,
  ),
  status: bookingStatusEnum("status").notNull().default("confirmed"),
  contractUrl: text("contract_url"),
  contractSignedByLocumAt: timestamp("contract_signed_by_locum_at"),
  contractSignedByClinicAt: timestamp("contract_signed_by_clinic_at"),
  escrowAmount: integer("escrow_amount"),
  checkedInAt: timestamp("checked_in_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id),
  raisedByLocumId: integer("raised_by_locum_id").references(
    () => locumsTable.id,
  ),
  raisedByClinicId: integer("raised_by_clinic_id"),
  disputeType: disputeTypeEnum("dispute_type").notNull(),
  description: text("description").notNull(),
  evidenceUrls: text("evidence_urls"),
  status: disputeStatusEnum("dispute_status").notNull().default("open"),
  resolutionNotes: text("resolution_notes"),
  penaltyAppliedToLocum: integer("penalty_applied_to_locum").default(0),
  penaltyAppliedToClinic: integer("penalty_applied_to_clinic").default(0),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  checkedInAt: true,
  completedAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  resolvedAt: true,
  penaltyAppliedToLocum: true,
  penaltyAppliedToClinic: true,
  resolutionNotes: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
