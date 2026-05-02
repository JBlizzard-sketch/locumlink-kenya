import { Router } from "express";
import { db } from "@workspace/db";
import { bookingsTable, shiftsTable, locumsTable, paymentsTable, disputesTable, clinicsTable, specialtiesTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

async function enrichBooking(booking: any) {
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, booking.shiftId)).limit(1);
  const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, booking.locumId)).limit(1);
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, booking.id)).limit(1);
  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.bookingId, booking.id)).limit(1);
  let enrichedShift = shift;
  if (shift) {
    const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, shift.clinicId)).limit(1);
    const [specialty] = await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, shift.specialtyId)).limit(1);
    (enrichedShift as any).clinic = clinic || null;
    (enrichedShift as any).specialty = specialty || null;
  }
  return { ...booking, shift: enrichedShift, locum: locum || null, payment: payment || null, dispute: dispute || null };
}

router.get("/bookings", authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (req.query.status) conditions.push(eq(bookingsTable.status, req.query.status as any));
    const query = db.select().from(bookingsTable);
    const raw = conditions.length > 0
      ? await query.where(and(...conditions)).limit(limit).offset(offset)
      : await query.limit(limit).offset(offset);
    const data = await Promise.all(raw.map(enrichBooking));
    res.json({ data, total: data.length, page, limit });
  } catch (err) {
    req.log.error({ err }, "List bookings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bookings/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(await enrichBooking(booking));
  } catch (err) {
    req.log.error({ err }, "Get booking error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings/:id/check-in", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [booking] = await db.update(bookingsTable)
      .set({ status: "checked_in", checkedInAt: new Date(), updatedAt: new Date() })
      .where(eq(bookingsTable.id, id)).returning();
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(booking);
  } catch (err) {
    req.log.error({ err }, "Check in error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings/:id/complete", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [booking] = await db.update(bookingsTable)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(bookingsTable.id, id)).returning();
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.escrowAmount) {
      const platformFee = Math.round(booking.escrowAmount * 0.1);
      const locumPayout = booking.escrowAmount - platformFee;
      await db.insert(paymentsTable).values({
        bookingId: id,
        grossAmount: booking.escrowAmount,
        platformFee,
        locumPayout,
        paymentMethod: "mpesa",
        status: "completed",
        paidAt: new Date(),
        releasedAt: new Date(),
      });
    }
    res.json(booking);
  } catch (err) {
    req.log.error({ err }, "Complete booking error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings/:id/sign-contract", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { userId, role } = (req as any).user;
  try {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (role === "locum") updateData.contractSignedByLocumAt = new Date();
    else updateData.contractSignedByClinicAt = new Date();
    const [booking] = await db.update(bookingsTable).set(updateData).where(eq(bookingsTable.id, id)).returning();
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(booking);
  } catch (err) {
    req.log.error({ err }, "Sign contract error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
