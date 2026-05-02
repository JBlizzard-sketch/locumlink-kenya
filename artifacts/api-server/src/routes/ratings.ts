import { Router } from "express";
import { db } from "@workspace/db";
import { ratingsTable, bookingsTable, shiftsTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import { SubmitRatingBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/bookings/:bookingId/rating", authenticate, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId as string);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = SubmitRatingBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    const existing = await db.select().from(ratingsTable)
      .where(and(eq(ratingsTable.bookingId, bookingId), eq(ratingsTable.raterType, parse.data.raterType as any)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Rating already submitted for this booking" });
      return;
    }
    const [rating] = await db.insert(ratingsTable).values({
      bookingId,
      raterType: parse.data.raterType as any,
      overallScore: parse.data.overallScore,
      criteria: parse.data.criteria || null,
      comment: parse.data.comment,
    }).returning();
    res.status(201).json(rating);
  } catch (err) {
    req.log.error({ err }, "Submit rating error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bookings/:bookingId/rating", async (req, res) => {
  const bookingId = parseInt(req.params.bookingId as string);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const data = await db.select().from(ratingsTable).where(eq(ratingsTable.bookingId, bookingId));
    const avg = data.length > 0 ? data.reduce((s, r) => s + r.overallScore, 0) / data.length : 0;
    res.json({ data, total: data.length, averageScore: avg });
  } catch (err) {
    req.log.error({ err }, "Get booking ratings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/locums/:id/ratings", async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.locumId, id));
    const bookingIds = bookings.map(b => b.id);
    const allRatings: any[] = [];
    for (const bid of bookingIds) {
      const r = await db.select().from(ratingsTable).where(eq(ratingsTable.bookingId, bid));
      allRatings.push(...r.filter(rt => rt.raterType === "clinic"));
    }
    const avg = allRatings.length > 0 ? allRatings.reduce((s, r) => s + r.overallScore, 0) / allRatings.length : 0;
    res.json({ data: allRatings, total: allRatings.length, averageScore: avg });
  } catch (err) {
    req.log.error({ err }, "Get locum ratings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clinics/:id/ratings", async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const clinicBookings = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .innerJoin(shiftsTable, eq(bookingsTable.shiftId, shiftsTable.id))
      .where(eq(shiftsTable.clinicId, id));
    const bookingIds = clinicBookings.map(b => b.id);
    if (bookingIds.length === 0) {
      res.json({ data: [], total: 0, averageScore: 0 });
      return;
    }
    const data = await db.select().from(ratingsTable)
      .where(and(inArray(ratingsTable.bookingId, bookingIds), eq(ratingsTable.raterType, "locum")));
    const avg = data.length > 0 ? data.reduce((s, r) => s + r.overallScore, 0) / data.length : 0;
    res.json({ data, total: data.length, averageScore: avg });
  } catch (err) {
    req.log.error({ err }, "Get clinic ratings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
