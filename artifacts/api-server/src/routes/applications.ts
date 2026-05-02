import { Router } from "express";
import { db } from "@workspace/db";
import { shiftApplicationsTable, shiftsTable, locumsTable, bookingsTable, clinicsTable, specialtiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ApplyToShiftBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router = Router();

async function enrichApplication(app: any) {
  const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, app.locumId)).limit(1);
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, app.shiftId)).limit(1);
  let shiftWithClinic = shift;
  if (shift) {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, shift.clinicId)).limit(1);
    const [specialty] = await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, shift.specialtyId)).limit(1);
    (shiftWithClinic as any).clinic = clinic || null;
    (shiftWithClinic as any).specialty = specialty || null;
  }
  return { ...app, locum: locum || null, shift: shiftWithClinic };
}

router.get("/shifts/:shiftId/applications", authenticate, async (req, res) => {
  const shiftId = parseInt(req.params.shiftId as string);
  if (isNaN(shiftId)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const raw = await db.select().from(shiftApplicationsTable).where(eq(shiftApplicationsTable.shiftId, shiftId));
    const data = await Promise.all(raw.map(enrichApplication));
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "List applications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/shifts/:shiftId/applications", authenticate, async (req, res) => {
  const shiftId = parseInt(req.params.shiftId as string);
  if (isNaN(shiftId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = ApplyToShiftBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (!locum) { res.status(400).json({ error: "No locum profile found" }); return; }
    if (locum.verificationStatus !== "verified") {
      res.status(403).json({ error: "Your credentials must be verified before applying to shifts" });
      return;
    }
    const existing = await db.select().from(shiftApplicationsTable)
      .where(and(eq(shiftApplicationsTable.shiftId, shiftId), eq(shiftApplicationsTable.locumId, locum.id))).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Already applied to this shift" });
      return;
    }
    const [application] = await db.insert(shiftApplicationsTable).values({
      shiftId,
      locumId: locum.id,
      coverMessage: parse.data.coverMessage,
    }).returning();
    res.status(201).json(await enrichApplication(application));
  } catch (err) {
    req.log.error({ err }, "Apply to shift error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/applications/:id/shortlist", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [app] = await db.update(shiftApplicationsTable)
      .set({ status: "shortlisted", updatedAt: new Date() })
      .where(eq(shiftApplicationsTable.id, id)).returning();
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    res.json(await enrichApplication(app));
  } catch (err) {
    req.log.error({ err }, "Shortlist error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/applications/:id/confirm", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [app] = await db.update(shiftApplicationsTable)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(shiftApplicationsTable.id, id)).returning();
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, app.shiftId)).limit(1);
    const rate = shift?.rate || 0;
    const platformFee = Math.round(rate * 0.1);
    const [booking] = await db.insert(bookingsTable).values({
      shiftId: app.shiftId,
      locumId: app.locumId,
      applicationId: app.id,
      escrowAmount: rate,
    }).returning();
    await db.update(shiftsTable)
      .set({ status: "filled", positionsFilled: (shift?.positionsFilled || 0) + 1, updatedAt: new Date() })
      .where(eq(shiftsTable.id, app.shiftId));
    res.status(201).json(booking);
  } catch (err) {
    req.log.error({ err }, "Confirm application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/applications/:id/reject", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [app] = await db.update(shiftApplicationsTable)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(shiftApplicationsTable.id, id)).returning();
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    res.json(await enrichApplication(app));
  } catch (err) {
    req.log.error({ err }, "Reject application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/applications/my", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (!locum) { res.json({ data: [], total: 0 }); return; }
    const raw = await db.select().from(shiftApplicationsTable).where(eq(shiftApplicationsTable.locumId, locum.id));
    const data = await Promise.all(raw.map(enrichApplication));
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "My applications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
