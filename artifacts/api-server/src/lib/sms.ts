/**
 * Africa's Talking SMS service
 *
 * Environment variables required:
 *   AT_API_KEY    — Africa's Talking API key
 *   AT_USERNAME   — Africa's Talking username (sandbox = "sandbox")
 *   AT_SENDER_ID  — Short code / sender ID (optional, defaults to none)
 *   AT_ENV        — "sandbox" or "production" (default: sandbox)
 */

import { logger } from "./logger";

const AT_ENV = process.env.AT_ENV || "sandbox";
const API_KEY = process.env.AT_API_KEY || "";
const USERNAME = process.env.AT_USERNAME || "sandbox";
const SENDER_ID = process.env.AT_SENDER_ID || "";

const BASE_URL =
  AT_ENV === "production"
    ? "https://api.africastalking.com/version1"
    : "https://api.sandbox.africastalking.com/version1";

export function isConfigured(): boolean {
  return !!(API_KEY && USERNAME);
}

export interface SmsResult {
  recipients: Array<{
    number: string;
    status: string;
    cost: string;
    messageId: string;
  }>;
}

/**
 * Send a single SMS message to one or more recipients
 */
export async function sendSms({
  to,
  message,
}: {
  to: string | string[];   // E.164 format e.g. "+254712345678"
  message: string;
}): Promise<SmsResult | null> {
  if (!isConfigured()) {
    logger.warn("SMS not configured — skipping send");
    return null;
  }
  const recipients = Array.isArray(to) ? to.join(",") : to;
  const body = new URLSearchParams({
    username: USERNAME,
    to: recipients,
    message,
  });
  if (SENDER_ID) body.set("from", SENDER_ID);

  try {
    const resp = await fetch(`${BASE_URL}/messaging`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: API_KEY,
      },
      body: body.toString(),
    });
    if (!resp.ok) {
      const err = await resp.text();
      logger.error({ err, status: resp.status }, "AT SMS send failed");
      return null;
    }
    const data = await resp.json() as { SMSMessageData: SmsResult };
    return data.SMSMessageData;
  } catch (err) {
    logger.error({ err }, "AT SMS exception");
    return null;
  }
}

// Pre-built SMS templates
export const SMS_TEMPLATES = {
  applicationReceived: (locumName: string, shiftDate: string, clinicName: string) =>
    `LocumLink: Your application for the ${shiftDate} shift at ${clinicName} has been received, ${locumName}. You will be notified of the outcome shortly.`,

  applicationShortlisted: (locumName: string, clinicName: string) =>
    `LocumLink: Great news! You've been shortlisted for a shift at ${clinicName}. Log in to view details and confirm your slot.`,

  applicationConfirmed: (locumName: string, shiftDate: string, clinicName: string, rate: number) =>
    `LocumLink: Confirmed! Your shift at ${clinicName} on ${shiftDate} is booked. Rate: KES ${rate.toLocaleString()}. Check your contract in the app.`,

  applicationRejected: (locumName: string, clinicName: string) =>
    `LocumLink: Unfortunately your application to ${clinicName} was not selected this time. Keep applying — new shifts are added daily.`,

  newApplication: (clinicName: string, shiftTitle: string, applicantCount: number) =>
    `LocumLink: ${clinicName} — ${applicantCount} new application(s) for "${shiftTitle}". Review and shortlist candidates in the app.`,

  paymentReleased: (locumName: string, amountKes: number) =>
    `LocumLink: KES ${amountKes.toLocaleString()} has been sent to your M-Pesa number. Thank you for your service!`,

  shiftReminder: (locumName: string, shiftDate: string, clinicName: string, startTime: string) =>
    `LocumLink: Reminder — you have a shift tomorrow at ${clinicName} starting at ${startTime} on ${shiftDate}. Safe travels!`,

  credentialVerified: (locumName: string) =>
    `LocumLink: Your credentials have been verified! You can now apply to shifts across Nairobi. Welcome to LocumLink.`,

  credentialRejected: (locumName: string, reason: string) =>
    `LocumLink: Your credential verification was unsuccessful. Reason: ${reason}. Please re-upload and resubmit through the app.`,
};
