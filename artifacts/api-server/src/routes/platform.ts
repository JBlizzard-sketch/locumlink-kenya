import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, locumsTable, clinicsTable, shiftsTable, bookingsTable } from "@workspace/db";
import { eq, gte, count } from "drizzle-orm";

const router = Router();

router.get("/platform/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [[openShiftsRow], [verifiedLocumsRow], [clinicsRow], [bookingsThisMonthRow]] = await Promise.all([
      db.select({ n: count() }).from(shiftsTable)
        .where(eq(shiftsTable.status, "open")),
      db.select({ n: count() }).from(locumsTable)
        .where(eq(locumsTable.verificationStatus, "verified")),
      db.select({ n: count() }).from(clinicsTable),
      db.select({ n: count() }).from(bookingsTable)
        .where(gte(bookingsTable.createdAt, new Date(monthStart))),
    ]);

    res.json({
      openShifts: openShiftsRow?.n ?? 0,
      verifiedLocums: verifiedLocumsRow?.n ?? 0,
      registeredClinics: clinicsRow?.n ?? 0,
      shiftsFilledThisMonth: bookingsThisMonthRow?.n ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Platform stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
