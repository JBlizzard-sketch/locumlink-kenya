import { Router } from "express";
import { db } from "@workspace/db";
import { clinicsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { CreateClinicBody, UpdateClinicBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router = Router();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
}

router.get("/clinics", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (req.query.subCounty) conditions.push(eq(clinicsTable.subCounty, req.query.subCounty as string));
    if (req.query.facilityType) conditions.push(eq(clinicsTable.facilityType, req.query.facilityType as any));
    const query = db.select().from(clinicsTable);
    const data = conditions.length > 0
      ? await query.where(and(...conditions)).limit(limit).offset(offset)
      : await query.limit(limit).offset(offset);
    res.json({ data, total: data.length, page, limit });
  } catch (err) {
    req.log.error({ err }, "List clinics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clinics", authenticate, async (req, res) => {
  const parse = CreateClinicBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", details: parse.error.message });
    return;
  }
  const { userId } = (req as any).user;
  try {
    const [clinic] = await db.insert(clinicsTable).values({
      ...parse.data,
      userId,
      slug: slugify(parse.data.name),
      facilityType: parse.data.facilityType as any,
    }).returning();
    res.status(201).json(clinic);
  } catch (err) {
    req.log.error({ err }, "Create clinic error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clinics/me", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);
    if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }
    res.json(clinic);
  } catch (err) {
    req.log.error({ err }, "Get my clinic error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clinics/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, id)).limit(1);
    if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }
    res.json(clinic);
  } catch (err) {
    req.log.error({ err }, "Get clinic error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/clinics/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = UpdateClinicBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    const updateData: Record<string, any> = { ...parse.data, updatedAt: new Date() };
    if (parse.data.facilityType) updateData.facilityType = parse.data.facilityType as any;
    const [clinic] = await db.update(clinicsTable).set(updateData).where(eq(clinicsTable.id, id)).returning();
    if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }
    res.json(clinic);
  } catch (err) {
    req.log.error({ err }, "Update clinic error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
