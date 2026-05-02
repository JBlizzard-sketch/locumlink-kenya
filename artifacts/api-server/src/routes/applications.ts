import { Router } from "express";
import { db } from "@workspace/db";
import { shiftApplicationsTable, shiftsTable, locumsTable, bookingsTable, clinicsTable, specialtiesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ApplyToShiftBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
import { sendToUser } from "../lib/sse";

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

    // Notify the clinic that a new application arrived
    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, shiftId)).limit(1);
    if (shift) {
      const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, shift.clinicId)).limit(1);
      if (clinic) {
        await db.insert(notificationsTable).values({
          userId: clinic.userId,
          channel: "in_app",
          type: "application_received",
          title: "New Application",
          content: `${locum.firstName} ${locum.lastName} applied for "${shift.title}"`,
        });
        sendToUser(clinic.userId, {
          type: "application_received",
          payload: {
            shiftId,
            shiftTitle: shift.title,
            locumName: `${locum.firstName} ${locum.lastName}`,
          },
        });
      }
    }

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

    // Notify locum they were shortlisted
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, app.locumId)).limit(1);
    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, app.shiftId)).limit(1);
    if (locum && shift) {
      await db.insert(notificationsTable).values({
        userId: locum.userId,
        channel: "in_app",
        type: "application_shortlisted",
        title: "You've Been Shortlisted",
        content: `Great news — you've been shortlisted for "${shift.title}". Stand by for confirmation.`,
      });
      sendToUser(locum.userId, {
        type: "application_shortlisted",
        payload: { shiftId: shift.id, shiftTitle: shift.title },
      });
    }

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
    const [booking] = await db.insert(bookingsTable).values({
      shiftId: app.shiftId,
      locumId: app.locumId,
      applicationId: app.id,
      escrowAmount: rate,
    }).returning();
    await db.update(shiftsTable)
      .set({ status: "filled", positionsFilled: (shift?.positionsFilled || 0) + 1, updatedAt: new Date() })
      .where(eq(shiftsTable.id, app.shiftId));

    // Notify locum their application was confirmed
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, app.locumId)).limit(1);
    if (locum && shift) {
      await db.insert(notificationsTable).values({
        userId: locum.userId,
        channel: "in_app",
        type: "application_confirmed",
        title: "Booking Confirmed!",
        content: `Your application for "${shift.title}" has been confirmed. Please sign the contract to proceed.`,
      });
      sendToUser(locum.userId, {
        type: "application_confirmed",
        payload: { bookingId: booking.id, shiftId: shift.id, shiftTitle: shift.title },
      });
    }

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

    // Notify locum they were rejected
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, app.locumId)).limit(1);
    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, app.shiftId)).limit(1);
    if (locum && shift) {
      await db.insert(notificationsTable).values({
        userId: locum.userId,
        channel: "in_app",
        type: "application_rejected",
        title: "Application Not Selected",
        content: `Your application for "${shift.title}" was not selected. Keep applying — more shifts open daily.`,
      });
      sendToUser(locum.userId, {
        type: "application_rejected",
        payload: { shiftId: shift.id, shiftTitle: shift.title },
      });
    }

    res.json(await enrichApplication(app));
  } catch (err) {
    req.log.error({ err }, "Reject application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/applications/:id/withdraw", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (!locum) { res.status(403).json({ error: "No locum profile" }); return; }

    const [app] = await db.select().from(shiftApplicationsTable).where(eq(shiftApplicationsTable.id, id)).limit(1);
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    if (app.locumId !== locum.id) { res.status(403).json({ error: "Not your application" }); return; }
    if (!["applied", "shortlisted"].includes(app.status)) {
      res.status(400).json({ error: "Only pending or shortlisted applications can be withdrawn" });
      return;
    }

    const [updated] = await db.update(shiftApplicationsTable)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(eq(shiftApplicationsTable.id, id))
      .returning();

    // Notify the clinic
    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, app.shiftId)).limit(1);
    if (shift) {
      const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, shift.clinicId)).limit(1);
      if (clinic) {
        await db.insert(notificationsTable).values({
          userId: clinic.userId,
          channel: "in_app",
          type: "application_withdrawn",
          title: "Application Withdrawn",
          content: `${locum.firstName} ${locum.lastName} has withdrawn their application for "${shift.title}".`,
        });
        sendToUser(clinic.userId, {
          type: "application_withdrawn",
          payload: { shiftId: shift.id, shiftTitle: shift.title, locumName: `${locum.firstName} ${locum.lastName}` },
        });
      }
    }

    res.json(await enrichApplication(updated));
  } catch (err) {
    req.log.error({ err }, "Withdraw application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/applications/my-map", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
    if (!locum) { res.json({ data: {} }); return; }
    const raw = await db.select({
      id: shiftApplicationsTable.id,
      shiftId: shiftApplicationsTable.shiftId,
      status: shiftApplicationsTable.status,
    }).from(shiftApplicationsTable).where(eq(shiftApplicationsTable.locumId, locum.id));
    const data: Record<number, { id: number; status: string }> = {};
    for (const app of raw) { data[app.shiftId] = { id: app.id, status: app.status }; }
    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "My applications map error");
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
