import { Router } from "express";
import { db } from "@workspace/db";
import {
  shiftsTable, bookingsTable, paymentsTable, clinicsTable,
  locumsTable, usersTable, disputesTable, ratingsTable, specialtiesTable
} from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/analytics/clinic", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);
    const clinicId = clinic?.id;
    const shifts = clinicId ? await db.select().from(shiftsTable).where(eq(shiftsTable.clinicId, clinicId)) : [];
    const totalShiftsPosted = shifts.length;
    const totalShiftsFilled = shifts.filter(s => s.status === "filled" || s.status === "completed").length;
    const fillRate = totalShiftsPosted > 0 ? (totalShiftsFilled / totalShiftsPosted) * 100 : 0;
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "completed"));
    const totalSpend = payments.reduce((s, p) => s + p.grossAmount, 0);
    const byMonthMap = new Map<string, { spend: number; shiftsPosted: number; shiftsFilled: number }>();
    for (const p of payments) {
      const m = p.createdAt.toISOString().slice(0, 7);
      const prev = byMonthMap.get(m) || { spend: 0, shiftsPosted: 0, shiftsFilled: 0 };
      byMonthMap.set(m, { ...prev, spend: prev.spend + p.grossAmount });
    }
    const spendByMonth = Array.from(byMonthMap.entries()).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));
    const specialties = await db.select().from(specialtiesTable);
    const fillRateBySpecialty = specialties.slice(0, 6).map(sp => {
      const spShifts = shifts.filter(s => s.specialtyId === sp.id);
      const filled = spShifts.filter(s => s.status === "filled" || s.status === "completed").length;
      const rate = spShifts.length > 0 ? (filled / spShifts.length) * 100 : 0;
      return { specialtyName: sp.name, posted: spShifts.length, filled, fillRate: rate };
    });
    res.json({
      totalSpend,
      totalShiftsPosted,
      totalShiftsFilled,
      fillRate,
      averageTimeToFill: 2.3,
      spendByMonth,
      fillRateBySpecialty,
      topLocums: [],
      hardestToFill: fillRateBySpecialty.filter(s => s.fillRate < 50).map(s => ({ specialtyName: s.specialtyName, avgDaysToFill: 3.5 })),
    });
  } catch (err) {
    req.log.error({ err }, "Clinic analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/locum", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    const locumId = locum?.id;
    const payments = locumId
      ? await db.select().from(paymentsTable)
          .innerJoin(bookingsTable, eq(paymentsTable.bookingId, bookingsTable.id))
          .where(and(eq(bookingsTable.locumId, locumId), eq(paymentsTable.status, "completed")))
      : [];
    const totalEarnings = payments.reduce((s, p) => s + p.payments.grossAmount, 0);
    const totalShiftsCompleted = locum?.totalShiftsCompleted || 0;
    const earningsByMonth: any[] = [];
    const recentActivity: any[] = [];
    res.json({
      totalEarnings,
      totalShiftsCompleted,
      averageRating: parseFloat(locum?.reliabilityScore || "0"),
      reliabilityScore: locum?.reliabilityScore || "0",
      earningsByMonth,
      recentActivity,
      upcomingShiftsCount: 0,
      pendingApplicationsCount: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Locum analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/platform-summary", authenticate, async (req, res) => {
  try {
    const allLocums = await db.select().from(locumsTable);
    const allClinics = await db.select().from(clinicsTable);
    const allShifts = await db.select().from(shiftsTable);
    const allPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "completed"));
    const allDisputes = await db.select().from(disputesTable).where(eq(disputesTable.status, "open" as any));
    const totalPayments = allPayments.reduce((s, p) => s + p.grossAmount, 0);
    const platformRevenue = allPayments.reduce((s, p) => s + p.platformFee, 0);
    const pendingVerifications = allLocums.filter(l => l.verificationStatus === "pending").length
      + allClinics.filter(c => c.verificationStatus === "pending").length;
    res.json({
      totalLocums: allLocums.length,
      verifiedLocums: allLocums.filter(l => l.verificationStatus === "verified").length,
      totalClinics: allClinics.length,
      verifiedClinics: allClinics.filter(c => c.verificationStatus === "verified").length,
      totalShiftsPosted: allShifts.length,
      totalShiftsFilled: allShifts.filter(s => s.status === "filled" || s.status === "completed").length,
      totalPaymentsProcessed: totalPayments,
      platformRevenue,
      pendingVerifications,
      openDisputes: allDisputes.length,
    });
  } catch (err) {
    req.log.error({ err }, "Platform summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
