import { Router } from "express";
import { db } from "@workspace/db";
import { shiftsTable, clinicsTable, specialtiesTable, bookingsTable } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { CreateShiftBody, UpdateShiftBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router = Router();

async function enrichShift(shift: any) {
  const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, shift.clinicId)).limit(1);
  const [specialty] = await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, shift.specialtyId)).limit(1);
  return { ...shift, clinic: clinic || null, specialty: specialty || null };
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
    const query = db.select().from(shiftsTable);
    const raw = conditions.length > 0
      ? await query.where(and(...conditions)).limit(limit).offset(offset)
      : await query.where(eq(shiftsTable.status, "open")).limit(limit).offset(offset);
    const data = await Promise.all(raw.map(enrichShift));
    res.json({ data, total: data.length, page, limit });
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
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = await db.select().from(shiftsTable).where(and(eq(shiftsTable.status, "open"), gte(shiftsTable.shiftDate, today))).limit(20);
    const data = await Promise.all(raw.map(enrichShift));
    res.json({ data, total: data.length, page: 1, limit: 20 });
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
    res.json({ ...enriched, applications: [], applicationCount: 0 });
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

router.delete("/shifts/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.update(shiftsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(shiftsTable.id, id));
    res.json({ message: "Shift cancelled" });
  } catch (err) {
    req.log.error({ err }, "Cancel shift error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
