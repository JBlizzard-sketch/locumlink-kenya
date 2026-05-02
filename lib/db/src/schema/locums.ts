import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { specialtiesTable } from "./specialties";

export const registrationBodyEnum = pgEnum("registration_body", [
  "KMPDC",
  "NCK",
  "KDTTB",
  "KPhB",
  "KORK",
  "PPB",
  "other",
]);

export const locumsTable = pgTable("locums", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  bio: text("bio"),
  primarySpecialtyId: integer("primary_specialty_id").references(
    () => specialtiesTable.id,
  ),
  registrationNumber: text("registration_number").notNull(),
  registrationBody: registrationBodyEnum("registration_body").notNull(),
  yearsExperience: integer("years_experience").notNull().default(0),
  mpesaNumber: text("mpesa_number"),
  preferredRatePerShift: integer("preferred_rate_per_shift"),
  verificationStatus: text("verification_status").notNull().default("pending"),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at"),
  reliabilityScore: numeric("reliability_score", {
    precision: 3,
    scale: 2,
  }).default("0"),
  totalShiftsCompleted: integer("total_shifts_completed").notNull().default(0),
  profilePhotoUrl: text("profile_photo_url"),
  idDocumentUrl: text("id_document_url"),
  practicingCertUrl: text("practicing_cert_url"),
  registrationCertUrl: text("registration_cert_url"),
  certExpiryDate: timestamp("cert_expiry_date"),
  isAvailableForUrgent: boolean("is_available_for_urgent").default(false),
  subCounty: text("sub_county"),
  county: text("county").default("Nairobi"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  kraPin: text("kra_pin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const locumSpecialtiesTable = pgTable("locum_specialties", {
  id: serial("id").primaryKey(),
  locumId: integer("locum_id")
    .notNull()
    .references(() => locumsTable.id),
  specialtyId: integer("specialty_id")
    .notNull()
    .references(() => specialtiesTable.id),
  isPrimary: boolean("is_primary").notNull().default(false),
  yearsInSpecialty: integer("years_in_specialty").default(0),
});

export const availabilitySlotsTable = pgTable("availability_slots", {
  id: serial("id").primaryKey(),
  locumId: integer("locum_id")
    .notNull()
    .references(() => locumsTable.id),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  isAvailable: boolean("is_available").notNull().default(true),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringDayOfWeek: integer("recurring_day_of_week"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLocumSchema = createInsertSchema(locumsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verificationStatus: true,
  verifiedAt: true,
  reliabilityScore: true,
  totalShiftsCompleted: true,
});

export type InsertLocum = z.infer<typeof insertLocumSchema>;
export type Locum = typeof locumsTable.$inferSelect;
