import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { clinicsTable } from "./clinics";
import { specialtiesTable } from "./specialties";

export const shiftTemplatesTable = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").notNull().references(() => clinicsTable.id),
  name: text("name").notNull(),
  specialtyId: integer("specialty_id").references(() => specialtiesTable.id),
  title: text("title"),
  description: text("description"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  rate: integer("rate"),
  urgency: text("urgency").default("normal"),
  positionsAvailable: integer("positions_available").default(1),
  specificRequirements: text("specific_requirements"),
  minYearsExperience: integer("min_years_experience"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
