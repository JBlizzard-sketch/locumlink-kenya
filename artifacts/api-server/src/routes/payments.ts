import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, bookingsTable } from "@workspace/db";
import { eq, and, gte, SQL } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/payments", authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const data = await db.select().from(paymentsTable).limit(limit).offset(offset);
    res.json({ data, total: data.length, page, limit });
  } catch (err) {
    req.log.error({ err }, "List payments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payments/earnings-summary", authenticate, async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "completed"));
    const totalEarnings = payments.reduce((s, p) => s + p.grossAmount, 0);
    const netEarnings = payments.reduce((s, p) => s + p.locumPayout, 0);
    const platformFeesDeducted = payments.reduce((s, p) => s + p.platformFee, 0);
    const byMonthMap = new Map<string, { earnings: number; shifts: number }>();
    for (const p of payments) {
      const m = p.createdAt.toISOString().slice(0, 7);
      const prev = byMonthMap.get(m) || { earnings: 0, shifts: 0 };
      byMonthMap.set(m, { earnings: prev.earnings + p.grossAmount, shifts: prev.shifts + 1 });
    }
    const byMonth = Array.from(byMonthMap.entries()).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));
    res.json({
      totalEarnings,
      totalShifts: payments.length,
      averagePerShift: payments.length > 0 ? Math.round(totalEarnings / payments.length) : 0,
      platformFeesDeducted,
      netEarnings,
      byMonth,
      bySpecialty: [],
      taxYear: year,
      kraReadyGrossIncome: totalEarnings,
    });
  } catch (err) {
    req.log.error({ err }, "Earnings summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payments/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
    if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
    res.json(payment);
  } catch (err) {
    req.log.error({ err }, "Get payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
