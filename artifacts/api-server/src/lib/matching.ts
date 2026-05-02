/**
 * LocumLink Kenya — Smart Shift Matching Algorithm
 *
 * Scores each locum against a shift on 5 weighted dimensions:
 *   1. Specialty match        (40%) — hard filter: must match primary specialty
 *   2. Experience level       (20%) — years vs shift minimum requirement
 *   3. Reliability score      (20%) — historical completion rate / rating
 *   4. Proximity              (10%) — same sub-county > same county > anywhere
 *   5. Rate alignment         (10%) — locum preferred rate vs shift rate
 *
 * Returns a score 0–100. Locums scoring below 40 are suppressed from results.
 */

import { db } from "@workspace/db";
import {
  locumsTable,
  shiftsTable,
  availabilitySlotsTable,
  shiftApplicationsTable,
} from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";

export interface MatchScore {
  locumId: number;
  score: number; // 0-100
  breakdown: {
    specialty: number;
    experience: number;
    reliability: number;
    proximity: number;
    rate: number;
  };
  reasons: string[];
}

export interface LocumCandidate {
  id: number;
  primarySpecialtyId: number | null;
  yearsExperience: number;
  reliabilityScore: string | null;
  totalShiftsCompleted: number;
  isAvailableForUrgent: boolean | null;
  subCounty: string | null;
  county: string | null;
  preferredRatePerShift: number | null;
  verificationStatus: string;
}

export interface ShiftRequirements {
  id: number;
  specialtyId: number;
  clinicId: number;
  shiftDate: string;
  urgency: string;
  rate: number;
  minYearsExperience: number | null;
  subCounty?: string | null;
  county?: string | null;
}

/**
 * Score a single locum against a shift
 */
export function scoreLocumForShift(
  locum: LocumCandidate,
  shift: ShiftRequirements
): MatchScore {
  const breakdown = { specialty: 0, experience: 0, reliability: 0, proximity: 0, rate: 0 };
  const reasons: string[] = [];

  // 1. Specialty (40 pts) — hard filter
  if (locum.primarySpecialtyId === shift.specialtyId) {
    breakdown.specialty = 40;
  } else {
    // Hard fail — different specialty
    return { locumId: locum.id, score: 0, breakdown, reasons: ["Specialty mismatch"] };
  }

  // 2. Experience (20 pts)
  const minExp = shift.minYearsExperience || 0;
  if (locum.yearsExperience >= minExp) {
    const extra = locum.yearsExperience - minExp;
    breakdown.experience = Math.min(20, 12 + extra * 2);
    if (extra === 0) reasons.push("Meets minimum experience");
    else reasons.push(`${locum.yearsExperience} years experience`);
  } else {
    // Below minimum — partial score
    const pct = locum.yearsExperience / Math.max(1, minExp);
    breakdown.experience = Math.round(pct * 10);
    reasons.push(`${locum.yearsExperience}/${minExp} years (below minimum)`);
  }

  // 3. Reliability (20 pts)
  const reliability = parseFloat(locum.reliabilityScore || "0");
  if (locum.totalShiftsCompleted === 0) {
    // New locum — give benefit of the doubt
    breakdown.reliability = 10;
    reasons.push("New to platform");
  } else {
    breakdown.reliability = Math.round((reliability / 5) * 20);
    reasons.push(`Reliability: ${reliability.toFixed(1)}/5`);
  }

  // 4. Proximity (10 pts)
  if (locum.subCounty && shift.subCounty && locum.subCounty === shift.subCounty) {
    breakdown.proximity = 10;
    reasons.push(`Same sub-county: ${locum.subCounty}`);
  } else if (locum.county === (shift.county || "Nairobi")) {
    breakdown.proximity = 6;
    reasons.push("Same county");
  } else {
    breakdown.proximity = 2;
  }

  // 5. Rate alignment (10 pts)
  if (locum.preferredRatePerShift) {
    const preferred = locum.preferredRatePerShift;
    const offered = shift.rate;
    if (offered >= preferred) {
      breakdown.rate = 10;
      reasons.push(`Rate KES ${offered.toLocaleString()} (at or above preferred)`);
    } else {
      const ratio = offered / preferred;
      breakdown.rate = Math.round(ratio * 10);
      reasons.push(`Rate KES ${offered.toLocaleString()} (preferred: KES ${preferred.toLocaleString()})`);
    }
  } else {
    breakdown.rate = 5; // No preference set — neutral
  }

  // Urgent shift boost: only locums flagged available for urgent
  let urgencyBonus = 0;
  if (shift.urgency === "urgent" || shift.urgency === "emergency") {
    if (locum.isAvailableForUrgent) {
      urgencyBonus = 5;
      reasons.push("Available for urgent shifts");
    } else {
      urgencyBonus = -10;
      reasons.push("Not flagged for urgent shifts");
    }
  }

  const total = Math.min(100, Math.max(0,
    breakdown.specialty + breakdown.experience + breakdown.reliability +
    breakdown.proximity + breakdown.rate + urgencyBonus
  ));

  return { locumId: locum.id, score: total, breakdown, reasons };
}

/**
 * Find and rank the best locums for a given shift
 */
export async function findMatchedLocums(
  shiftId: number,
  limit = 20
): Promise<Array<LocumCandidate & { matchScore: MatchScore }>> {
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, shiftId)).limit(1);
  if (!shift) throw new Error(`Shift ${shiftId} not found`);

  const shiftReq: ShiftRequirements = {
    id: shift.id,
    specialtyId: shift.specialtyId,
    clinicId: shift.clinicId,
    shiftDate: shift.shiftDate,
    urgency: shift.urgency,
    rate: shift.rate,
    minYearsExperience: shift.minYearsExperience,
  };

  // Fetch all verified locums with matching specialty
  const locums = await db
    .select()
    .from(locumsTable)
    .where(
      and(
        eq(locumsTable.primarySpecialtyId, shift.specialtyId),
        eq(locumsTable.verificationStatus, "verified")
      )
    );

  // Check availability for the shift date
  const availableOnDate = new Set<number>();
  const availSlots = await db
    .select()
    .from(availabilitySlotsTable)
    .where(eq(availabilitySlotsTable.date, shift.shiftDate));
  for (const slot of availSlots) {
    if (slot.isAvailable) availableOnDate.add(slot.locumId);
  }

  // Check who has already applied
  const existingApps = await db
    .select()
    .from(shiftApplicationsTable)
    .where(eq(shiftApplicationsTable.shiftId, shiftId));
  const alreadyApplied = new Set(existingApps.map(a => a.locumId));

  // Score each eligible locum
  const scored = locums
    .filter(l => !alreadyApplied.has(l.id))
    .map(l => {
      const score = scoreLocumForShift(l as LocumCandidate, shiftReq);
      return { ...l, matchScore: score };
    })
    .filter(l => l.matchScore.score >= 30) // minimum threshold
    .sort((a, b) => b.matchScore.score - a.matchScore.score)
    .slice(0, limit);

  return scored;
}

/**
 * Find matching shifts for a locum (for locum dashboard)
 */
export async function findMatchedShiftsForLocum(
  locumId: number,
  limit = 20
): Promise<Array<typeof shiftsTable.$inferSelect & { matchScore: number }>> {
  const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, locumId)).limit(1);
  if (!locum) return [];

  const today = new Date().toISOString().split("T")[0];
  const openShifts = await db
    .select()
    .from(shiftsTable)
    .where(
      and(
        eq(shiftsTable.specialtyId, locum.primarySpecialtyId!),
        eq(shiftsTable.status, "open"),
        gte(shiftsTable.shiftDate, today)
      )
    )
    .limit(50);

  const existingApps = await db
    .select()
    .from(shiftApplicationsTable)
    .where(eq(shiftApplicationsTable.locumId, locumId));
  const applied = new Set(existingApps.map(a => a.shiftId));

  const shiftReqs: ShiftRequirements[] = openShifts
    .filter(s => !applied.has(s.id))
    .map(s => ({
      id: s.id,
      specialtyId: s.specialtyId,
      clinicId: s.clinicId,
      shiftDate: s.shiftDate,
      urgency: s.urgency,
      rate: s.rate,
      minYearsExperience: s.minYearsExperience,
    }));

  return shiftReqs
    .map(s => {
      const score = scoreLocumForShift(locum as LocumCandidate, s);
      const shift = openShifts.find(os => os.id === s.id)!;
      return { ...shift, matchScore: score.score };
    })
    .filter(s => s.matchScore >= 30)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
