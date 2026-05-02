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
import { clinicsTable } from "./clinics";
import { specialtiesTable } from "./specialties";
import { locumsTable } from "./locums";

export const shiftStatusEnum = pgEnum("shift_status", [
  "draft",
  "open",
  "filled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const shiftUrgencyEnum = pgEnum("shift_urgency", [
  "normal",
  "urgent",
  "emergency",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "applied",
  "shortlisted",
  "confirmed",
  "rejected",
  "withdrawn",
]);

export const shiftsTable = pgTable("shifts", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinicsTable.id),
  specialtyId: integer("specialty_id")
    .notNull()
    .references(() => specialtiesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  shiftDate: text("shift_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  rate: integer("rate").notNull(),
  positionsAvailable: integer("positions_available").notNull().default(1),
  positionsFilled: integer("positions_filled").notNull().default(0),
  status: shiftStatusEnum("status").notNull().default("open"),
  urgency: shiftUrgencyEnum("urgency").notNull().default("normal"),
  minYearsExperience: integer("min_years_experience").default(0),
  specificRequirements: text("specific_requirements"),
  isRecurring: text("is_recurring").default("false"),
  recurringPattern: text("recurring_pattern"),
  insuranceCovered: text("insurance_covered").default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shiftApplicationsTable = pgTable("shift_applications", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id")
    .notNull()
    .references(() => shiftsTable.id),
  locumId: integer("locum_id")
    .notNull()
    .references(() => locumsTable.id),
  status: applicationStatusEnum("status").notNull().default("applied"),
  coverMessage: text("cover_message"),
  matchScore: numeric("match_score", { precision: 5, scale: 2 }),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShiftSchema = createInsertSchema(shiftsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  positionsFilled: true,
  status: true,
});

export const insertShiftApplicationSchema = createInsertSchema(
  shiftApplicationsTable,
).omit({
  id: true,
  appliedAt: true,
  updatedAt: true,
  status: true,
  matchScore: true,
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shiftsTable.$inferSelect;
export type InsertShiftApplication = z.infer<typeof insertShiftApplicationSchema>;
export type ShiftApplication = typeof shiftApplicationsTable.$inferSelect;
