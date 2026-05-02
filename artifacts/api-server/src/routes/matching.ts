import { Router } from "express";
import { db } from "@workspace/db";
import {
  shiftsTable,
  clinicsTable,
  specialtiesTable,
  locumsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { findMatchedLocums, findMatchedShiftsForLocum } from "../lib/matching";
import { authenticate } from "../middlewares/auth";

const router = Router();

/** GET /api/shifts/:id/matched-locums — ranked list of best-fit locums for a shift */
router.get("/shifts/:id/matched-locums", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const matches = await findMatchedLocums(id, 20);
    const data = await Promise.all(matches.map(async (m) => {
      const [sp] = m.primarySpecialtyId
        ? await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, m.primarySpecialtyId)).limit(1)
        : [null];
      return {
        ...m,
        specialty: sp,
        matchScore: m.matchScore.score,
        matchBreakdown: m.matchScore.breakdown,
        matchReasons: m.matchScore.reasons,
      };
    }));
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "Matched locums error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/locums/me/matched-shifts — personalised shift recommendations for the logged-in locum */
router.get("/locums/me/matched-shifts", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (!locum) { res.json({ data: [], total: 0 }); return; }
    const shifts = await findMatchedShiftsForLocum(locum.id, 20);
    const data = await Promise.all(shifts.map(async (s) => {
      const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, s.clinicId)).limit(1);
      const [specialty] = await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, s.specialtyId)).limit(1);
      return { ...s, clinic: clinic || null, specialty: specialty || null };
    }));
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "Matched shifts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
