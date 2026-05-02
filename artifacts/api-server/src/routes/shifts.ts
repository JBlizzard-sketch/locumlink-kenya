import { Router } from "express";
import { db } from "@workspace/db";
import { shiftsTable, clinicsTable, specialtiesTable, locumsTable, shiftApplicationsTable, notificationsTable } from "@workspace/db";
import { eq, and, gte, lte, SQL, desc, asc, inArray } from "drizzle-orm";
import { CreateShiftBody, UpdateShiftBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
import { sendToUser } from "../lib/sse";

const router = Router();

async function enrichShift(shift: any) {
  const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, shift.clinicId)).limit(1);
  const [specialty] = await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, shift.specialtyId)).limit(1);
  return { ...shift, clinic: clinic || null, specialty: specialty || null };
}

function computeMatchScore(shift: any, locum: any, clinicSubCounty?: string | null): number {
  let score = 0;
  if (locum.primarySpecialtyId && shift.specialtyId === locum.primarySpecialtyId) score += 40;
  const minExp = shift.minYearsExperience || 0;
  if (locum.yearsExperience >= minExp) score += 20;
  if (clinicSubCounty && locum.subCounty && clinicSubCounty === locum.subCounty) score += 20;
  const preferred = locum.preferredRatePerShift;
  if (preferred && shift.rate >= preferred * 0.8) score += 10;
  if (locum.isAvailableForUrgent && (shift.urgency === "urgent" || shift.urgency === "emergency")) score += 10;
  return Math.min(score, 100);
}

router.get("/shifts", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (req.query.specialtyId) conditions.push(eq(shiftsTable.specialtyId, parseInt(req.query.specialtyId as string)));
    if (req.query.urgency) conditions.push(eq(shiftsTable.urgency, req.query.urgency as any));
    if (req.query.clinicId) conditions.push(eq(shiftsTable.clinicId, parseInt(req.query.clinicId as string)));
    if (req.query.status) conditions.push(eq(shiftsTable.status, req.query.status as any));
    if (req.query.date) conditions.push(eq(shiftsTable.shiftDate, req.query.date as string));
    if (req.query.dateFrom) conditions.push(gte(shiftsTable.shiftDate, req.query.dateFrom as string));
    if (req.query.dateTo) conditions.push(lte(shiftsTable.shiftDate, req.query.dateTo as string));
    if (req.query.minRate) conditions.push(gte(shiftsTable.rate, parseInt(req.query.minRate as string)));
    if (req.query.maxRate) conditions.push(lte(shiftsTable.rate, parseInt(req.query.maxRate as string)));

    const baseConditions: SQL[] = conditions.length > 0 ? conditions : [eq(shiftsTable.status, "open")];
    if (conditions.length === 0) {
      const today = new Date().toISOString().split("T")[0];
      baseConditions.push(gte(shiftsTable.shiftDate, today));
    }

    const sortBy = req.query.sortBy as string;
    let orderExpr;
    if (sortBy === "rate_desc") orderExpr = desc(shiftsTable.rate);
    else if (sortBy === "rate_asc") orderExpr = asc(shiftsTable.rate);
    else if (sortBy === "date_desc") orderExpr = desc(shiftsTable.shiftDate);
    else orderExpr = asc(shiftsTable.shiftDate);

    const raw = await db.select().from(shiftsTable)
      .where(and(...baseConditions))
      .orderBy(orderExpr)
      .limit(limit).offset(offset);
    const data = await Promise.all(raw.map(enrichShift));

    let total = data.length + offset;
    if (data.length === limit) total = offset + limit + 1;

    const subCounty = req.query.subCounty as string | undefined;
    const filtered = subCounty
      ? data.filter((s: any) => s.clinic?.subCounty === subCounty)
      : data;

    res.json({ data: filtered, total: filtered.length + offset, page, limit });
  } catch (err) {
    req.log.error({ err }, "List shifts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/shifts", authenticate, async (req, res) => {
  const parse = CreateShiftBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", details: parse.error.message });
    return;
  }
  const { userId } = (req as any).user;
  try {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);
    if (!clinic) { res.status(400).json({ error: "No clinic profile found" }); return; }
    const [shift] = await db.insert(shiftsTable).values({
      ...parse.data,
      clinicId: clinic.id,
      urgency: (parse.data.urgency || "normal") as any,
    }).returning();
    res.status(201).json(await enrichShift(shift));
  } catch (err) {
    req.log.error({ err }, "Create shift error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/shifts/upcoming", authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = await db.select().from(shiftsTable).where(and(eq(shiftsTable.status, "filled"), gte(shiftsTable.shiftDate, today))).limit(20);
    const data = await Promise.all(raw.map(enrichShift));
    res.json({ data, total: data.length, page: 1, limit: 20 });
  } catch (err) {
    req.log.error({ err }, "Upcoming shifts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/shifts/matched", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = await db.select().from(shiftsTable)
      .where(and(eq(shiftsTable.status, "open"), gte(shiftsTable.shiftDate, today)))
      .orderBy(asc(shiftsTable.shiftDate))
      .limit(50);
    const enriched = await Promise.all(raw.map(enrichShift));

    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);

    const data = enriched.map((shift: any) => {
      const score = locum ? computeMatchScore(shift, locum, shift.clinic?.subCounty) : 0;
      return { ...shift, matchScore: score };
    }).sort((a: any, b: any) => b.matchScore - a.matchScore);

    res.json({ data, total: data.length, page: 1, limit: 50 });
  } catch (err) {
    req.log.error({ err }, "Matched shifts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/shifts/:id", async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id)).limit(1);
    if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }
    const enriched = await enrichShift(shift);
    const apps = await db.select({ id: shiftApplicationsTable.id })
      .from(shiftApplicationsTable)
      .where(eq(shiftApplicationsTable.shiftId, id));
    res.json({ ...enriched, applications: [], applicationCount: apps.length });
  } catch (err) {
    req.log.error({ err }, "Get shift error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/shifts/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = UpdateShiftBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    const updateData: Record<string, any> = { ...parse.data, updatedAt: new Date() };
    if (parse.data.urgency) updateData.urgency = parse.data.urgency as any;
    if (parse.data.status) updateData.status = parse.data.status as any;
    const [shift] = await db.update(shiftsTable).set(updateData).where(eq(shiftsTable.id, id)).returning();
    if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }
    res.json(await enrichShift(shift));
  } catch (err) {
    req.log.error({ err }, "Update shift error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/shifts/my-invitations", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (!locum) { res.json({ data: [], total: 0 }); return; }

    const inviteNotifs = await db.select()
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.type, "shift_invitation")));

    const shiftIds: number[] = [];
    for (const notif of inviteNotifs) {
      const meta = notif.metadata as any;
      if (meta?.shiftId && typeof meta.shiftId === "number" && !shiftIds.includes(meta.shiftId)) {
        shiftIds.push(meta.shiftId);
      }
    }

    if (shiftIds.length === 0) { res.json({ data: [], total: 0 }); return; }

    const shifts = await db.select().from(shiftsTable)
      .where(and(inArray(shiftsTable.id, shiftIds), eq(shiftsTable.status, "open")));

    const enriched = await Promise.all(shifts.map(enrichShift));
    res.json({ data: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err }, "My invitations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/shifts/:shiftId/invite/:locumId", authenticate, async (req, res) => {
  const shiftId = parseInt(req.params.shiftId as string);
  const locumId = parseInt(req.params.locumId as string);
  if (isNaN(shiftId) || isNaN(locumId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { userId } = (req as any).user;
  try {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);
    if (!clinic) { res.status(403).json({ error: "Not a clinic account" }); return; }
    const [shift] = await db.select().from(shiftsTable).where(and(eq(shiftsTable.id, shiftId), eq(shiftsTable.clinicId, clinic.id))).limit(1);
    if (!shift) { res.status(404).json({ error: "Shift not found or not yours" }); return; }
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, locumId)).limit(1);
    if (!locum) { res.status(404).json({ error: "Locum not found" }); return; }
    await db.insert(notificationsTable).values({
      userId: locum.userId,
      channel: "in_app",
      type: "shift_invitation",
      title: "You've been invited to apply",
      content: `${clinic.name} has invited you to apply for "${shift.title}" on ${shift.shiftDate}.`,
      metadata: { shiftId: shift.id, clinicName: clinic.name },
    });
    sendToUser(locum.userId, {
      type: "shift_invitation",
      payload: { shiftId: shift.id, shiftTitle: shift.title, clinicName: clinic.name },
    });
    res.json({ message: "Invitation sent" });
  } catch (err) {
    req.log.error({ err }, "Invite locum error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/shifts/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { userId } = (req as any).user;
  try {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);
    if (!clinic) { res.status(403).json({ error: "Not a clinic account" }); return; }

    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id)).limit(1);
    if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }
    if (shift.clinicId !== clinic.id) { res.status(403).json({ error: "Not your shift" }); return; }
    if (!["open"].includes(shift.status)) {
      res.status(400).json({ error: "Only open shifts can be cancelled" });
      return;
    }

    await db.update(shiftsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(shiftsTable.id, id));

    // Notify all active applicants
    const applicants = await db.select().from(shiftApplicationsTable)
      .where(and(eq(shiftApplicationsTable.shiftId, id), inArray(shiftApplicationsTable.status, ["applied", "shortlisted"])));

    for (const app of applicants) {
      const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, app.locumId)).limit(1);
      if (!locum) continue;
      await db.insert(notificationsTable).values({
        userId: locum.userId,
        channel: "in_app",
        type: "shift_cancelled",
        title: "Shift Cancelled",
        content: `The shift "${shift.title}" on ${shift.shiftDate} has been cancelled by the clinic.`,
        metadata: { shiftId: shift.id },
      });
      sendToUser(locum.userId, {
        type: "shift_cancelled",
        payload: { shiftId: shift.id, shiftTitle: shift.title },
      });
    }

    res.json({ message: "Shift cancelled" });
  } catch (err) {
    req.log.error({ err }, "Cancel shift error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
