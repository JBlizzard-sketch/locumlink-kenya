import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, bookingsTable, locumsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { stkPush, stkQuery, b2cPayout, isConfigured } from "../lib/mpesa";
import { sendToUser } from "../lib/sse";
import { authenticate } from "../middlewares/auth";

const router = Router();

const CALLBACK_BASE =
  process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/api`
    : "https://locumlink.replit.app/api";

/** POST /api/payments/:bookingId/initiate-mpesa
 * Clinic initiates STK Push to pay into escrow for a confirmed booking
 */
router.post("/payments/:bookingId/initiate-mpesa", authenticate, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (!isConfigured()) {
    res.status(503).json({
      error: "M-Pesa not configured",
      hint: "Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, MPESA_SHORTCODE",
    });
    return;
  }

  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const { phone } = req.body as { phone: string };
    if (!phone) { res.status(400).json({ error: "phone is required" }); return; }

    const result = await stkPush({
      phone,
      amountKes: booking.escrowAmount || 0,
      accountRef: `LOCUMLINK-${bookingId}`,
      description: `Escrow payment for booking #${bookingId}`,
      callbackUrl: `${CALLBACK_BASE}/payments/mpesa-callback`,
    });

    // Record pending payment
    await db.insert(paymentsTable).values({
      bookingId,
      grossAmount: booking.escrowAmount || 0,
      platformFee: Math.round((booking.escrowAmount || 0) * 0.1),
      locumPayout: Math.round((booking.escrowAmount || 0) * 0.9),
      paymentMethod: "mpesa",
      status: "pending",
      mpesaCheckoutRequestId: result.CheckoutRequestID,
    });

    res.json({
      message: "STK Push sent. Check your phone.",
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
    });
  } catch (err) {
    req.log.error({ err }, "Initiate M-Pesa error");
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/payments/mpesa-callback
 * Daraja calls this URL after the user completes or cancels the STK Push
 */
router.post("/payments/mpesa-callback", async (req, res) => {
  try {
    const body = req.body as any;
    const stk = body?.Body?.stkCallback;
    if (!stk) { res.json({ ResultCode: 0 }); return; }

    const checkoutId = stk.CheckoutRequestID as string;
    const resultCode = stk.ResultCode as number;

    if (resultCode === 0) {
      // Payment successful
      const items: any[] = stk.CallbackMetadata?.Item || [];
      const get = (name: string) => items.find((i: any) => i.Name === name)?.Value;
      const mpesaTransactionId = get("MpesaReceiptNumber") as string;
      const paidAt = new Date();

      // Find payment by checkout request ID
      const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.mpesaCheckoutRequestId, checkoutId))
        .limit(1);

      if (payment) {
        await db.update(paymentsTable).set({
          status: "completed",
          mpesaTransactionId,
          paidAt,
          updatedAt: new Date(),
        }).where(eq(paymentsTable.id, payment.id));

        // Notify locum via SSE
        const [booking] = await db.select().from(bookingsTable)
          .where(eq(bookingsTable.id, payment.bookingId)).limit(1);
        if (booking) {
          const [locum] = await db.select().from(locumsTable)
            .where(eq(locumsTable.id, booking.locumId)).limit(1);
          if (locum) {
            sendToUser(locum.userId, {
              type: "payment_released",
              payload: { bookingId: booking.id, amount: payment.locumPayout, mpesaTransactionId },
            });
          }
        }
      }
    } else {
      // Payment failed or cancelled
      await db.update(paymentsTable).set({ status: "failed", updatedAt: new Date() })
        .where(eq(paymentsTable.mpesaCheckoutRequestId, checkoutId));
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    req.log.error({ err }, "M-Pesa callback error");
    res.json({ ResultCode: 0 });
  }
});

/** POST /api/payments/:bookingId/payout-locum
 * Platform admin triggers B2C payout to locum after completion
 */
router.post("/payments/:bookingId/payout-locum", authenticate, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (!isConfigured()) {
    res.status(503).json({ error: "M-Pesa not configured" });
    return;
  }

  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, booking.locumId)).limit(1);
    if (!locum || !locum.mpesaNumber) {
      res.status(400).json({ error: "Locum has no M-Pesa number on file" });
      return;
    }

    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, bookingId)).limit(1);
    if (!payment) { res.status(404).json({ error: "No payment record for this booking" }); return; }

    const result = await b2cPayout({
      phone: locum.mpesaNumber,
      amountKes: payment.locumPayout,
      remarks: `LocumLink payout booking #${bookingId}`,
      occasion: `Shift ${booking.shiftId}`,
      callbackUrl: `${CALLBACK_BASE}/payments/b2c-callback`,
      timeoutUrl: `${CALLBACK_BASE}/payments/b2c-timeout`,
    });

    await db.update(paymentsTable).set({
      status: "completed",
      paidAt: new Date(),
      releasedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(paymentsTable.id, payment.id));

    sendToUser(locum.userId, {
      type: "payment_released",
      payload: { bookingId, amount: payment.locumPayout, phone: locum.mpesaNumber },
    });

    res.json({ message: "B2C payout initiated", result });
  } catch (err) {
    req.log.error({ err }, "B2C payout error");
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/payments/b2c-callback — Daraja B2C result callback */
router.post("/payments/b2c-callback", async (req, res) => {
  req.log.info({ body: req.body }, "B2C callback received");
  res.json({ ResultCode: 0 });
});

/** POST /api/payments/b2c-timeout — Daraja B2C timeout callback */
router.post("/payments/b2c-timeout", async (req, res) => {
  req.log.warn({ body: req.body }, "B2C timeout received");
  res.json({ ResultCode: 0 });
});

/** GET /api/payments/mpesa-status/:checkoutRequestId — poll payment status */
router.get("/payments/mpesa-status/:checkoutRequestId", authenticate, async (req, res) => {
  const { checkoutRequestId } = req.params;
  try {
    const [payment] = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.mpesaCheckoutRequestId, checkoutRequestId)).limit(1);
    if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
    res.json({ status: payment.status, mpesaTransactionId: payment.mpesaTransactionId });
  } catch (err) {
    req.log.error({ err }, "M-Pesa status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
