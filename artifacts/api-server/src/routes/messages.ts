import { Router } from "express";
import { z } from "zod";
import { db, messagesTable, bookingsTable, usersTable, locumsTable, clinicsTable, shiftsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

const SendMessageBody = z.object({
  body: z.string().min(1).max(2000),
});

// Helper — verify the requesting user is a participant of the booking
// Returns { booking, clinicId } or null if not authorised
async function getParticipantBooking(bookingId: number, userId: number) {
  const [row] = await db
    .select({
      bookingId: bookingsTable.id,
      locumId: bookingsTable.locumId,
      shiftId: bookingsTable.shiftId,
      clinicId: shiftsTable.clinicId,
    })
    .from(bookingsTable)
    .innerJoin(shiftsTable, eq(shiftsTable.id, bookingsTable.shiftId))
    .where(eq(bookingsTable.id, bookingId))
    .limit(1);

  if (!row) return null;

  // Resolve locum's userId
  const [locum] = await db.select({ userId: locumsTable.userId }).from(locumsTable)
    .where(eq(locumsTable.id, row.locumId)).limit(1);

  // Resolve clinic's userId
  const [clinic] = await db.select({ userId: clinicsTable.userId }).from(clinicsTable)
    .where(eq(clinicsTable.id, row.clinicId)).limit(1);

  if (!locum || !clinic) return null;
  if (locum.userId !== userId && clinic.userId !== userId) return null;

  return row;
}

// Resolve a display name for a user — tries locum first, then clinic contact name, falls back to email
async function getSenderName(userId: number): Promise<string> {
  const [locum] = await db
    .select({ firstName: locumsTable.firstName, lastName: locumsTable.lastName })
    .from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);

  if (locum) return `${locum.firstName} ${locum.lastName}`.trim();

  const [clinic] = await db
    .select({ contactName: clinicsTable.contactName })
    .from(clinicsTable).where(eq(clinicsTable.userId, userId)).limit(1);

  if (clinic) return clinic.contactName;

  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  return user?.email ?? "Unknown";
}

// GET /bookings/:id/messages
router.get("/bookings/:id/messages", authenticate, async (req, res) => {
  const bookingId = Number(req.params["id"]);
  const userId = (req as any).user.userId;

  const booking = await getParticipantBooking(bookingId, userId);
  if (!booking) {
    res.status(403).json({ error: "Not authorised to view these messages" });
    return;
  }

  const rows = await db
    .select({
      id: messagesTable.id,
      bookingId: messagesTable.bookingId,
      senderId: messagesTable.senderId,
      senderRole: usersTable.role,
      body: messagesTable.body,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(eq(messagesTable.bookingId, bookingId))
    .orderBy(messagesTable.createdAt);

  // Resolve sender names (batched uniquely)
  const uniqueSenderIds = [...new Set(rows.map(r => r.senderId))];
  const nameMap = new Map<number, string>();
  await Promise.all(uniqueSenderIds.map(async id => {
    nameMap.set(id, await getSenderName(id));
  }));

  const data = rows.map(r => ({
    id: r.id,
    bookingId: r.bookingId,
    senderId: r.senderId,
    senderName: nameMap.get(r.senderId) ?? "Unknown",
    senderRole: r.senderRole,
    body: r.body,
    isRead: r.isRead,
    createdAt: r.createdAt,
  }));

  res.json({ data });
});

// POST /bookings/:id/messages
router.post("/bookings/:id/messages", authenticate, async (req, res) => {
  const bookingId = Number(req.params["id"]);
  const userId = (req as any).user.userId;

  const booking = await getParticipantBooking(bookingId, userId);
  if (!booking) {
    res.status(403).json({ error: "Not authorised to send messages here" });
    return;
  }

  const parse = SendMessageBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", details: parse.error.message });
    return;
  }

  const [inserted] = await db.insert(messagesTable).values({
    bookingId,
    senderId: userId,
    body: parse.data.body,
  }).returning();

  const [user] = await db.select({ role: usersTable.role }).from(usersTable)
    .where(eq(usersTable.id, userId)).limit(1);

  const senderName = await getSenderName(userId);

  res.status(201).json({
    id: inserted.id,
    bookingId: inserted.bookingId,
    senderId: inserted.senderId,
    senderName,
    senderRole: user?.role ?? "",
    body: inserted.body,
    isRead: inserted.isRead,
    createdAt: inserted.createdAt,
  });
});

// POST /bookings/:id/messages/read
router.post("/bookings/:id/messages/read", authenticate, async (req, res) => {
  const bookingId = Number(req.params["id"]);
  const userId = (req as any).user.userId;

  const booking = await getParticipantBooking(bookingId, userId);
  if (!booking) {
    res.status(403).json({ error: "Not authorised" });
    return;
  }

  const result = await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.bookingId, bookingId),
        ne(messagesTable.senderId, userId),
        eq(messagesTable.isRead, false),
      )
    )
    .returning({ id: messagesTable.id });

  res.json({ updated: result.length });
});

export default router;
