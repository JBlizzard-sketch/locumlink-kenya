import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const raterTypeEnum = pgEnum("rater_type", ["locum", "clinic"]);

export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id),
  raterType: raterTypeEnum("rater_type").notNull(),
  overallScore: integer("overall_score").notNull(),
  criteria: jsonb("criteria"),
  comment: text("comment"),
  isPublic: text("is_public").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratingsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratingsTable.$inferSelect;
