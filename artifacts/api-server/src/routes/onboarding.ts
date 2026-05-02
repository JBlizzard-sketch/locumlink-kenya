import { Router } from "express";
import { db } from "@workspace/db";
import { locumsTable, clinicsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

const LocumOnboardSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  registrationNumber: z.string().min(1),
  registrationBody: z.enum(["KMPDC", "NCK", "KDTTB", "KPhB", "KORK", "PPB", "other"]),
  yearsExperience: z.number().int().min(0).default(0),
  primarySpecialtyId: z.number().int().optional(),
  subCounty: z.string().optional(),
  mpesaNumber: z.string().optional(),
  bio: z.string().optional(),
  isAvailableForUrgent: z.boolean().optional(),
});

const ClinicOnboardSchema = z.object({
  name: z.string().min(1),
  facilityType: z.enum([
    "general_practice", "specialist_clinic", "hospital", "dental_clinic",
    "maternity_clinic", "diagnostic_centre", "pharmacy", "physiotherapy",
    "eye_clinic", "other",
  ]),
  address: z.string().min(1),
  subCounty: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  mohFacilityNumber: z.string().optional(),
  bio: z.string().optional(),
});

router.post("/onboarding/locum", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  const parse = LocumOnboardSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", details: parse.error.message });
    return;
  }
  try {
    const existing = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }
    const [locum] = await db.insert(locumsTable).values({
      userId,
      firstName: parse.data.firstName,
      lastName: parse.data.lastName,
      registrationNumber: parse.data.registrationNumber,
      registrationBody: parse.data.registrationBody,
      yearsExperience: parse.data.yearsExperience ?? 0,
      primarySpecialtyId: parse.data.primarySpecialtyId ?? null,
      subCounty: parse.data.subCounty ?? null,
      mpesaNumber: parse.data.mpesaNumber ?? null,
      bio: parse.data.bio ?? null,
      isAvailableForUrgent: parse.data.isAvailableForUrgent ?? false,
    }).returning();
    res.status(201).json(locum);
  } catch (err) {
    req.log.error({ err }, "Locum onboarding error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/onboarding/clinic", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  const parse = ClinicOnboardSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", details: parse.error.message });
    return;
  }
  try {
    const existing = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);
    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }
    const baseSlug = parse.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
    const [clinic] = await db.insert(clinicsTable).values({
      userId,
      slug,
      county: "Nairobi",
      name: parse.data.name,
      facilityType: parse.data.facilityType,
      address: parse.data.address,
      subCounty: parse.data.subCounty,
      contactName: parse.data.contactName,
      contactEmail: parse.data.contactEmail,
      contactPhone: parse.data.contactPhone,
      mohFacilityNumber: parse.data.mohFacilityNumber ?? null,
      bio: parse.data.bio ?? null,
    }).returning();
    res.status(201).json(clinic);
  } catch (err) {
    req.log.error({ err }, "Clinic onboarding error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
