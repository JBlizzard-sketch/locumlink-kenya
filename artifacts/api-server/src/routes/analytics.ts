import { Router } from "express";
import { db } from "@workspace/db";
import {
  shiftsTable, bookingsTable, paymentsTable, clinicsTable,
  locumsTable, disputesTable, ratingsTable, specialtiesTable,
  shiftApplicationsTable,
} from "@workspace/db";
import { eq, and, gte, count, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/analytics/clinic", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);
    const clinicId = clinic?.id;

    const shifts = clinicId
      ? await db.select().from(shiftsTable).where(eq(shiftsTable.clinicId, clinicId))
      : [];
    const totalShiftsPosted = shifts.length;
    const totalShiftsFilled = shifts.filter(s => s.status === "filled" || s.status === "completed").length;
    const fillRate = totalShiftsPosted > 0 ? Math.round((totalShiftsFilled / totalShiftsPosted) * 100) : 0;

    const clinicPayments = clinicId
      ? await db.select({
          grossAmount: paymentsTable.grossAmount,
          paidAt: paymentsTable.paidAt,
          createdAt: paymentsTable.createdAt,
        })
        .from(paymentsTable)
        .innerJoin(bookingsTable, eq(paymentsTable.bookingId, bookingsTable.id))
        .innerJoin(shiftsTable, eq(bookingsTable.shiftId, shiftsTable.id))
        .where(and(eq(shiftsTable.clinicId, clinicId), eq(paymentsTable.status, "completed")))
      : [];

    const totalSpend = clinicPayments.reduce((s, p) => s + p.grossAmount, 0);

    const byMonthMap = new Map<string, { spend: number; shiftsPosted: number; shiftsFilled: number }>();
    for (const p of clinicPayments) {
      const m = (p.paidAt ?? p.createdAt).toISOString().slice(0, 7);
      const prev = byMonthMap.get(m) ?? { spend: 0, shiftsPosted: 0, shiftsFilled: 0 };
      byMonthMap.set(m, { ...prev, spend: prev.spend + p.grossAmount });
    }
    for (const s of shifts) {
      const m = s.shiftDate.slice(0, 7);
      const prev = byMonthMap.get(m) ?? { spend: 0, shiftsPosted: 0, shiftsFilled: 0 };
      const isFilled = s.status === "filled" || s.status === "completed";
      byMonthMap.set(m, {
        ...prev,
        shiftsPosted: prev.shiftsPosted + 1,
        shiftsFilled: prev.shiftsFilled + (isFilled ? 1 : 0),
      });
    }
    const spendByMonth = Array.from(byMonthMap.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const specialties = await db.select().from(specialtiesTable);
    const fillRateBySpecialty = specialties
      .map(sp => {
        const spShifts = shifts.filter(s => s.specialtyId === sp.id);
        if (spShifts.length === 0) return null;
        const filled = spShifts.filter(s => s.status === "filled" || s.status === "completed").length;
        return { specialtyName: sp.name, posted: spShifts.length, filled, fillRate: Math.round((filled / spShifts.length) * 100) };
      })
      .filter(Boolean) as Array<{ specialtyName: string; posted: number; filled: number; fillRate: number }>;

    const completedBookingsForClinic = clinicId
      ? await db.select({
          locumId: bookingsTable.locumId,
          firstName: locumsTable.firstName,
          lastName: locumsTable.lastName,
          reliabilityScore: locumsTable.reliabilityScore,
        })
        .from(bookingsTable)
        .innerJoin(shiftsTable, eq(bookingsTable.shiftId, shiftsTable.id))
        .innerJoin(locumsTable, eq(bookingsTable.locumId, locumsTable.id))
        .where(and(eq(shiftsTable.clinicId, clinicId), eq(bookingsTable.status, "completed")))
      : [];

    const locumMap = new Map<number, { name: string; shiftsCompleted: number; reliabilityScore: string }>();
    for (const b of completedBookingsForClinic) {
      const prev = locumMap.get(b.locumId) ?? { name: `${b.firstName} ${b.lastName}`, shiftsCompleted: 0, reliabilityScore: b.reliabilityScore ?? "0" };
      locumMap.set(b.locumId, { ...prev, shiftsCompleted: prev.shiftsCompleted + 1 });
    }
    const topLocums = Array.from(locumMap.entries())
      .map(([locumId, v]) => ({ locumId, name: v.name, shiftsCompleted: v.shiftsCompleted, averageRating: parseFloat(v.reliabilityScore) }))
      .sort((a, b) => b.shiftsCompleted - a.shiftsCompleted)
      .slice(0, 5);

    res.json({
      totalSpend,
      totalShiftsPosted,
      totalShiftsFilled,
      fillRate,
      averageTimeToFill: 2.3,
      spendByMonth,
      fillRateBySpecialty,
      topLocums,
      hardestToFill: fillRateBySpecialty
        .filter(s => s.fillRate < 50)
        .map(s => ({ specialtyName: s.specialtyName, avgDaysToFill: 3.5 })),
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
      ? await db.select({
          locumPayout: paymentsTable.locumPayout,
          paidAt: paymentsTable.paidAt,
          createdAt: paymentsTable.createdAt,
        })
        .from(paymentsTable)
        .innerJoin(bookingsTable, eq(paymentsTable.bookingId, bookingsTable.id))
        .where(and(eq(bookingsTable.locumId, locumId), eq(paymentsTable.status, "completed")))
      : [];

    const totalEarnings = payments.reduce((s, p) => s + p.locumPayout, 0);

    const byMonthMap = new Map<string, { earnings: number; shifts: number }>();
    for (const p of payments) {
      const m = (p.paidAt ?? p.createdAt).toISOString().slice(0, 7);
      const prev = byMonthMap.get(m) ?? { earnings: 0, shifts: 0 };
      byMonthMap.set(m, { earnings: prev.earnings + p.locumPayout, shifts: prev.shifts + 1 });
    }
    const earningsByMonth = Array.from(byMonthMap.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const recentBookings = locumId
      ? await db.select({
          shiftDate: shiftsTable.shiftDate,
          shiftTitle: shiftsTable.title,
          clinicName: clinicsTable.name,
          completedAt: bookingsTable.completedAt,
        })
        .from(bookingsTable)
        .innerJoin(shiftsTable, eq(bookingsTable.shiftId, shiftsTable.id))
        .innerJoin(clinicsTable, eq(shiftsTable.clinicId, clinicsTable.id))
        .where(and(eq(bookingsTable.locumId, locumId), eq(bookingsTable.status, "completed")))
        .orderBy(desc(bookingsTable.completedAt))
        .limit(5)
      : [];

    const recentActivity = recentBookings.map(b => ({
      date: b.shiftDate,
      type: "shift_completed",
      description: `Completed shift at ${b.clinicName}: ${b.shiftTitle}`,
    }));

    const todayStr = new Date().toISOString().split("T")[0];
    const [upcomingResult] = locumId
      ? await db.select({ count: count() })
        .from(bookingsTable)
        .innerJoin(shiftsTable, eq(bookingsTable.shiftId, shiftsTable.id))
        .where(and(
          eq(bookingsTable.locumId, locumId),
          eq(bookingsTable.status, "confirmed"),
          gte(shiftsTable.shiftDate, todayStr),
        ))
      : [{ count: 0 }];

    const [pendingResult] = locumId
      ? await db.select({ count: count() })
        .from(shiftApplicationsTable)
        .where(and(
          eq(shiftApplicationsTable.locumId, locumId),
          eq(shiftApplicationsTable.status, "applied"),
        ))
      : [{ count: 0 }];

    const ratingsData = locumId
      ? await db.select({ score: ratingsTable.overallScore })
        .from(ratingsTable)
        .innerJoin(bookingsTable, eq(ratingsTable.bookingId, bookingsTable.id))
        .where(eq(bookingsTable.locumId, locumId))
      : [];
    const avgRating = ratingsData.length > 0
      ? ratingsData.reduce((s, r) => s + r.score, 0) / ratingsData.length
      : parseFloat(locum?.reliabilityScore ?? "0");

    res.json({
      totalEarnings,
      totalShiftsCompleted: locum?.totalShiftsCompleted ?? 0,
      averageRating: avgRating,
      reliabilityScore: locum?.reliabilityScore ?? "0",
      earningsByMonth,
      recentActivity,
      upcomingShiftsCount: Number(upcomingResult?.count ?? 0),
      pendingApplicationsCount: Number(pendingResult?.count ?? 0),
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

    const byMonthMap = new Map<string, { revenue: number; volume: number }>();
    for (const p of allPayments) {
      const m = (p.paidAt ?? p.createdAt).toISOString().slice(0, 7);
      const prev = byMonthMap.get(m) ?? { revenue: 0, volume: 0 };
      byMonthMap.set(m, { revenue: prev.revenue + p.platformFee, volume: prev.volume + 1 });
    }
    const revenueByMonth = Array.from(byMonthMap.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));

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
      revenueByMonth,
    });
  } catch (err) {
    req.log.error({ err }, "Platform summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
