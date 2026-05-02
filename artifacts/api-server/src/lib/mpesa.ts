/**
 * Safaricom Daraja API — M-Pesa integration
 * Supports: STK Push (C2B), B2C Payouts
 *
 * Environment variables required:
 *   MPESA_CONSUMER_KEY      — Daraja app consumer key
 *   MPESA_CONSUMER_SECRET   — Daraja app consumer secret
 *   MPESA_PASSKEY           — Lipa Na M-Pesa Online passkey
 *   MPESA_SHORTCODE         — Business shortcode (paybill / till number)
 *   MPESA_B2C_INITIATOR     — B2C initiator name
 *   MPESA_B2C_SECURITY_CRED — B2C security credential (encrypted)
 *   MPESA_ENV               — "sandbox" or "production" (default: sandbox)
 */

import { logger } from "./logger";

const ENV = process.env.MPESA_ENV || "sandbox";
const BASE_URL =
  ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379"; // sandbox default
const B2C_INITIATOR = process.env.MPESA_B2C_INITIATOR || "";
const B2C_SECURITY_CRED = process.env.MPESA_B2C_SECURITY_CRED || "";

// Cache the access token (valid for ~1 hour)
let _token: string | null = null;
let _tokenExpiry = 0;

export async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required");
  }
  const creds = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const resp = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  if (!resp.ok) throw new Error(`M-Pesa auth failed: ${resp.status}`);
  const data = (await resp.json()) as { access_token: string; expires_in: string };
  _token = data.access_token;
  _tokenExpiry = Date.now() + parseInt(data.expires_in) * 1000 - 60_000;
  return _token;
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
}

function password(ts: string): string {
  return Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64");
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/**
 * Initiate STK Push — prompt clinic/locum to pay via their phone
 */
export async function stkPush({
  phone,
  amountKes,
  accountRef,
  description,
  callbackUrl,
}: {
  phone: string;           // 254XXXXXXXXX format
  amountKes: number;       // integer KES
  accountRef: string;      // e.g. "BOOKING-42"
  description: string;
  callbackUrl: string;     // your /api/payments/mpesa-callback URL
}): Promise<StkPushResult> {
  const token = await getAccessToken();
  const ts = timestamp();
  const body = {
    BusinessShortCode: SHORTCODE,
    Password: password(ts),
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amountKes),
    PartyA: phone,
    PartyB: SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: accountRef,
    TransactionDesc: description,
  };
  const resp = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    logger.error({ err, status: resp.status }, "STK Push failed");
    throw new Error(`STK Push failed: ${resp.status} ${err}`);
  }
  return resp.json() as Promise<StkPushResult>;
}

/**
 * Query STK Push status — check if payment was completed
 */
export async function stkQuery(checkoutRequestId: string) {
  const token = await getAccessToken();
  const ts = timestamp();
  const resp = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: password(ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  if (!resp.ok) throw new Error(`STK Query failed: ${resp.status}`);
  return resp.json();
}

/**
 * B2C Payout — pay locum from platform after shift completion
 */
export async function b2cPayout({
  phone,
  amountKes,
  remarks,
  occasion,
  callbackUrl,
  timeoutUrl,
}: {
  phone: string;           // 254XXXXXXXXX
  amountKes: number;
  remarks: string;
  occasion: string;
  callbackUrl: string;
  timeoutUrl: string;
}) {
  if (!B2C_INITIATOR || !B2C_SECURITY_CRED) {
    throw new Error("B2C initiator credentials not configured");
  }
  const token = await getAccessToken();
  const resp = await fetch(`${BASE_URL}/mpesa/b2c/v3/paymentrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      InitiatorName: B2C_INITIATOR,
      SecurityCredential: B2C_SECURITY_CRED,
      CommandID: "BusinessPayment",
      Amount: Math.ceil(amountKes),
      PartyA: SHORTCODE,
      PartyB: phone,
      Remarks: remarks,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: callbackUrl,
      Occasion: occasion,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    logger.error({ err, status: resp.status }, "B2C payout failed");
    throw new Error(`B2C payout failed: ${resp.status} ${err}`);
  }
  return resp.json();
}

export function isConfigured(): boolean {
  return !!(CONSUMER_KEY && CONSUMER_SECRET && PASSKEY && SHORTCODE);
}
