import { Router } from "express";
import { db } from "@workspace/db";
import { locumsTable, availabilitySlotsTable, specialtiesTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { CreateLocumBody, UpdateLocumBody, SetLocumAvailabilityBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router = Router();

async function withSpecialty(locum: any) {
  if (!locum.primarySpecialtyId) return locum;
  const [sp] = await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, locum.primarySpecialtyId)).limit(1);
  return { ...locum, specialty: sp || null };
}

router.get("/locums", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (req.query.specialtyId) conditions.push(eq(locumsTable.primarySpecialtyId, parseInt(req.query.specialtyId as string)));
    if (req.query.verificationStatus) conditions.push(eq(locumsTable.verificationStatus, req.query.verificationStatus as string));
    if (req.query.subCounty) conditions.push(eq(locumsTable.subCounty, req.query.subCounty as string));
    const query = db.select().from(locumsTable);
    const raw = conditions.length > 0
      ? await query.where(and(...conditions)).limit(limit).offset(offset)
      : await query.limit(limit).offset(offset);
    const data = await Promise.all(raw.map(withSpecialty));
    res.json({ data, total: data.length, page, limit });
  } catch (err) {
    req.log.error({ err }, "List locums error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/locums", authenticate, async (req, res) => {
  const parse = CreateLocumBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", details: parse.error.message });
    return;
  }
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.insert(locumsTable).values({
      ...parse.data,
      userId,
      registrationBody: parse.data.registrationBody as any,
    }).returning();
    res.status(201).json(await withSpecialty(locum));
  } catch (err) {
    req.log.error({ err }, "Create locum error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/locums/me", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (!locum) { res.status(404).json({ error: "Locum not found" }); return; }
    res.json(await withSpecialty(locum));
  } catch (err) {
    req.log.error({ err }, "Get my locum error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/locums/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, id)).limit(1);
    if (!locum) { res.status(404).json({ error: "Locum not found" }); return; }
    res.json(await withSpecialty(locum));
  } catch (err) {
    req.log.error({ err }, "Get locum error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/locums/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = UpdateLocumBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    const [locum] = await db.update(locumsTable).set({ ...parse.data, updatedAt: new Date() }).where(eq(locumsTable.id, id)).returning();
    if (!locum) { res.status(404).json({ error: "Locum not found" }); return; }
    res.json(await withSpecialty(locum));
  } catch (err) {
    req.log.error({ err }, "Update locum error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/locums/:id/availability", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    let query = db.select().from(availabilitySlotsTable).where(eq(availabilitySlotsTable.locumId, id));
    const data = await query;
    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "Get availability error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/locums/:id/availability", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = SetLocumAvailabilityBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    await db.delete(availabilitySlotsTable).where(eq(availabilitySlotsTable.locumId, id));
    if (parse.data.slots.length > 0) {
      await db.insert(availabilitySlotsTable).values(
        parse.data.slots.map(s => ({ locumId: id, ...s }))
      );
    }
    res.json({ message: "Availability updated" });
  } catch (err) {
    req.log.error({ err }, "Set availability error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
