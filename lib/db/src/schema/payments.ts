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
import { bookingsTable } from "./bookings";

export const paymentMethodEnum = pgEnum("payment_method", [
  "mpesa",
  "bank_transfer",
  "card",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "escrowed",
  "processing",
  "completed",
  "failed",
  "refunded",
]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id),
  grossAmount: integer("gross_amount").notNull(),
  platformFee: integer("platform_fee").notNull(),
  locumPayout: integer("locum_payout").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: paymentStatusEnum("payment_status").notNull().default("pending"),
  mpesaCheckoutRequestId: text("mpesa_checkout_request_id"),
  mpesaTransactionId: text("mpesa_transaction_id"),
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  bankReference: text("bank_reference"),
  invoiceUrl: text("invoice_url"),
  invoiceNumber: text("invoice_number"),
  paidAt: timestamp("paid_at"),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  paidAt: true,
  releasedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
