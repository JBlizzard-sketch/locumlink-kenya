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
import { usersTable } from "./users";

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "under_review",
  "verified",
  "rejected",
  "suspended",
]);

export const facilityTypeEnum = pgEnum("facility_type", [
  "general_practice",
  "specialist_clinic",
  "hospital",
  "dental_clinic",
  "maternity_clinic",
  "diagnostic_centre",
  "pharmacy",
  "physiotherapy",
  "eye_clinic",
  "other",
]);

export const clinicsTable = pgTable("clinics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  facilityType: facilityTypeEnum("facility_type").notNull(),
  address: text("address").notNull(),
  subCounty: text("sub_county").notNull(),
  county: text("county").notNull().default("Nairobi"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  mohFacilityNumber: text("moh_facility_number"),
  kmpdc_licence: text("kmpdc_licence"),
  businessRegistration: text("business_registration"),
  mpesaPaybill: text("mpesa_paybill"),
  mpesaNumber: text("mpesa_number"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("pending"),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at"),
  payerScore: numeric("payer_score", { precision: 3, scale: 2 }).default("0"),
  totalShiftsPosted: integer("total_shifts_posted").notNull().default(0),
  totalShiftsFilled: integer("total_shifts_filled").notNull().default(0),
  logoUrl: text("logo_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clinicStaffTable = pgTable("clinic_staff", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinicsTable.id),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  role: text("role").notNull().default("scheduler"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const clinicNetworksTable = pgTable("clinic_networks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  adminClinicId: integer("admin_clinic_id")
    .notNull()
    .references(() => clinicsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clinicNetworkMembersTable = pgTable("clinic_network_members", {
  id: serial("id").primaryKey(),
  networkId: integer("network_id")
    .notNull()
    .references(() => clinicNetworksTable.id),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinicsTable.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertClinicSchema = createInsertSchema(clinicsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verificationStatus: true,
  verifiedAt: true,
  payerScore: true,
  totalShiftsPosted: true,
  totalShiftsFilled: true,
});

export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinicsTable.$inferSelect;
