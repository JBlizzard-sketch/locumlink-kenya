import { Router } from "express";
import { db } from "@workspace/db";
import { shiftTemplatesTable, clinicsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getClinicId(userId: number): Promise<number | null> {
  const [clinic] = await db.select({ id: clinicsTable.id })
    .from(clinicsTable)
    .where(eq(clinicsTable.userId, userId))
    .limit(1);
  return clinic?.id ?? null;
}

router.get("/clinics/me/shift-templates", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  const clinicId = await getClinicId(userId);
  if (!clinicId) {
    res.status(403).json({ error: "Clinic access required" });
    return;
  }
  const templates = await db
    .select()
    .from(shiftTemplatesTable)
    .where(eq(shiftTemplatesTable.clinicId, clinicId))
    .orderBy(shiftTemplatesTable.createdAt);
  res.json({ data: templates, total: templates.length });
});

router.post("/clinics/me/shift-templates", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  const clinicId = await getClinicId(userId);
  if (!clinicId) {
    res.status(403).json({ error: "Clinic access required" });
    return;
  }

  const {
    name, specialtyId, title, description,
    startTime, endTime, rate, urgency,
    positionsAvailable, specificRequirements, minYearsExperience,
  } = req.body as {
    name: string;
    specialtyId?: number;
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    rate?: number;
    urgency?: string;
    positionsAvailable?: number;
    specificRequirements?: string;
    minYearsExperience?: number;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: "Template name is required" });
    return;
  }

  const [template] = await db
    .insert(shiftTemplatesTable)
    .values({
      clinicId,
      name: name.trim(),
      specialtyId: specialtyId ?? null,
      title: title ?? null,
      description: description ?? null,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      rate: rate ?? null,
      urgency: urgency ?? "normal",
      positionsAvailable: positionsAvailable ?? 1,
      specificRequirements: specificRequirements ?? null,
      minYearsExperience: minYearsExperience ?? null,
    })
    .returning();

  res.status(201).json(template);
});

router.delete("/clinics/me/shift-templates/:id", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  const clinicId = await getClinicId(userId);
  if (!clinicId) {
    res.status(403).json({ error: "Clinic access required" });
    return;
  }
  const templateId = Number(req.params.id);
  const deleted = await db
    .delete(shiftTemplatesTable)
    .where(and(eq(shiftTemplatesTable.id, templateId), eq(shiftTemplatesTable.clinicId, clinicId)))
    .returning();

  if (!deleted.length) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.status(204).end();
});

export default router;
