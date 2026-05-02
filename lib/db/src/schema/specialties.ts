import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const specialtiesTable = pgTable("specialties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  suggestedRateMin: integer("suggested_rate_min").notNull(),
  suggestedRateMax: integer("suggested_rate_max").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSpecialtySchema = createInsertSchema(specialtiesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSpecialty = z.infer<typeof insertSpecialtySchema>;
export type Specialty = typeof specialtiesTable.$inferSelect;
