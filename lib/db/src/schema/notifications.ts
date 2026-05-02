import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "sms",
  "email",
  "in_app",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
  "read",
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  type: text("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  status: notificationStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    newShiftMatch: boolean("new_shift_match").notNull().default(true),
    applicationUpdate: boolean("application_update").notNull().default(true),
    bookingConfirmation: boolean("booking_confirmation").notNull().default(true),
    paymentUpdate: boolean("payment_update").notNull().default(true),
    shiftReminder: boolean("shift_reminder").notNull().default(true),
    ratingReceived: boolean("rating_received").notNull().default(true),
    credentialExpiry: boolean("credential_expiry").notNull().default(true),
    preferWhatsapp: boolean("prefer_whatsapp").notNull().default(true),
    preferSms: boolean("prefer_sms").notNull().default(false),
    preferEmail: boolean("prefer_email").notNull().default(true),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

export const insertNotificationSchema = createInsertSchema(
  notificationsTable,
).omit({
  id: true,
  createdAt: true,
  status: true,
  sentAt: true,
  readAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
