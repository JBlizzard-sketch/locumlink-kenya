import { Router } from "express";
import { db } from "@workspace/db";
import { locumsTable, clinicsTable, disputesTable, notificationsTable, paymentsTable, bookingsTable, shiftsTable } from "@workspace/db";
import { eq, inArray, SQL } from "drizzle-orm";
import { AdminVerifyLocumBody, AdminVerifyClinicBody, AdminResolveDisputeBody } from "@workspace/api-zod";
import { authenticate, requireRole } from "../middlewares/auth";
import { sendToUser } from "../lib/sse";

const router = Router();

router.get("/admin/verification-queue", authenticate, requireRole("platform_admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type as string;
    const data: any[] = [];
    if (!type || type === "locum") {
      const locums = await db.select().from(locumsTable).where(eq(locumsTable.verificationStatus, "pending")).limit(limit).offset(offset);
      data.push(...locums.map(l => ({
        id: l.id,
        type: "locum",
        name: `${l.firstName} ${l.lastName}`,
        registrationNumber: l.registrationNumber,
        submittedAt: l.createdAt,
        documents: [l.idDocumentUrl, l.practicingCertUrl, l.registrationCertUrl].filter(Boolean),
      })));
    }
    if (!type || type === "clinic") {
      const clinics = await db.select().from(clinicsTable).where(eq(clinicsTable.verificationStatus, "pending")).limit(limit).offset(offset);
      data.push(...clinics.map(c => ({
        id: c.id,
        type: "clinic",
        name: c.name,
        registrationNumber: c.mohFacilityNumber || c.businessRegistration || "",
        submittedAt: c.createdAt,
        documents: [c.kmpdc_licence, c.businessRegistration].filter(Boolean),
      })));
    }
    res.json({ data, total: data.length, page, limit });
  } catch (err) {
    req.log.error({ err }, "Verification queue error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/locums/:id/verify", authenticate, requireRole("platform_admin"), async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = AdminVerifyLocumBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    const [locum] = await db.update(locumsTable).set({
      verificationStatus: parse.data.status,
      verificationNotes: parse.data.notes,
      verifiedAt: parse.data.status === "verified" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(locumsTable.id, id)).returning();

    if (locum) {
      const isVerified = parse.data.status === "verified";
      const eventType = isVerified ? "credential_verified" : "credential_rejected";
      const title = isVerified ? "Credentials Verified ✓" : "Credentials Rejected";
      const content = isVerified
        ? "Your credentials have been verified. You can now apply to shifts on LocumLink."
        : `Your credential review requires attention. Notes: ${parse.data.notes || "Please re-submit your documents."}`;

      await db.insert(notificationsTable).values({
        userId: locum.userId,
        channel: "in_app",
        type: eventType,
        title,
        content,
        metadata: { userType: "locum" },
      });
      sendToUser(locum.userId, { type: eventType, payload: { status: parse.data.status, notes: parse.data.notes } });
    }

    res.json({ message: `Locum ${parse.data.status}` });
  } catch (err) {
    req.log.error({ err }, "Admin verify locum error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/clinics/:id/verify", authenticate, requireRole("platform_admin"), async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = AdminVerifyClinicBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    const [clinic] = await db.update(clinicsTable).set({
      verificationStatus: parse.data.status as any,
      verificationNotes: parse.data.notes,
      verifiedAt: parse.data.status === "verified" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(clinicsTable.id, id)).returning();

    if (clinic) {
      const isVerified = parse.data.status === "verified";
      const eventType = isVerified ? "credential_verified" : "credential_rejected";
      const title = isVerified ? "Clinic Verified ✓" : "Clinic Verification Rejected";
      const content = isVerified
        ? "Your clinic has been verified. You can now post shifts and hire locums on LocumLink."
        : `Your clinic verification was rejected. Notes: ${parse.data.notes || "Please re-submit your documents."}`;

      await db.insert(notificationsTable).values({
        userId: clinic.userId,
        channel: "in_app",
        type: eventType,
        title,
        content,
        metadata: { userType: "clinic" },
      });
      sendToUser(clinic.userId, { type: eventType, payload: { status: parse.data.status, notes: parse.data.notes } });
    }

    res.json({ message: `Clinic ${parse.data.status}` });
  } catch (err) {
    req.log.error({ err }, "Admin verify clinic error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/disputes/:id/resolve", authenticate, requireRole("platform_admin"), async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parse = AdminResolveDisputeBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    const [dispute] = await db.update(disputesTable).set({
      status: parse.data.status as any,
      resolutionNotes: parse.data.resolutionNotes,
      penaltyAppliedToLocum: parse.data.penaltyAppliedToLocum || 0,
      penaltyAppliedToClinic: parse.data.penaltyAppliedToClinic || 0,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(disputesTable.id, id)).returning();
    if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }

    // Push SSE to the locum who raised the dispute (if available)
    if (dispute.raisedByLocumId) {
      const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, dispute.raisedByLocumId)).limit(1);
      if (locum) {
        sendToUser(locum.userId, {
          type: "dispute_resolved",
          payload: { disputeId: dispute.id, status: parse.data.status, notes: parse.data.resolutionNotes },
        });
      }
    }

    res.json(dispute);
  } catch (err) {
    req.log.error({ err }, "Resolve dispute error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/payments", authenticate, requireRole("platform_admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;

    const conditions: SQL[] = [];
    if (statusFilter) {
      conditions.push(eq(paymentsTable.status, statusFilter as any));
    }

    const payments = await db
      .select({
        id: paymentsTable.id,
        bookingId: paymentsTable.bookingId,
        grossAmount: paymentsTable.grossAmount,
        platformFee: paymentsTable.platformFee,
        locumPayout: paymentsTable.locumPayout,
        paymentMethod: paymentsTable.paymentMethod,
        status: paymentsTable.status,
        mpesaTransactionId: paymentsTable.mpesaTransactionId,
        invoiceNumber: paymentsTable.invoiceNumber,
        paidAt: paymentsTable.paidAt,
        releasedAt: paymentsTable.releasedAt,
        createdAt: paymentsTable.createdAt,
        locumFirstName: locumsTable.firstName,
        locumLastName: locumsTable.lastName,
        clinicName: clinicsTable.name,
        shiftDate: shiftsTable.shiftDate,
        shiftTitle: shiftsTable.title,
      })
      .from(paymentsTable)
      .innerJoin(bookingsTable, eq(bookingsTable.id, paymentsTable.bookingId))
      .innerJoin(locumsTable, eq(locumsTable.id, bookingsTable.locumId))
      .innerJoin(shiftsTable, eq(shiftsTable.id, bookingsTable.shiftId))
      .innerJoin(clinicsTable, eq(clinicsTable.id, shiftsTable.clinicId))
      .where(conditions.length > 0 ? conditions[0] : undefined as any)
      .orderBy(paymentsTable.createdAt)
      .limit(limit)
      .offset(offset);

    const all = await db
      .select({ status: paymentsTable.status, locumPayout: paymentsTable.locumPayout })
      .from(paymentsTable);

    const pendingCount = all.filter(p => p.status === "pending").length;
    const escrowedCount = all.filter(p => p.status === "escrowed").length;
    const totalEscrowedVolume = all.filter(p => p.status === "escrowed").reduce((s, p) => s + p.locumPayout, 0);

    const data = payments.map(p => ({
      ...p,
      locumName: `${p.locumFirstName} ${p.locumLastName}`,
      clinicName: p.clinicName,
      shiftDate: p.shiftDate ?? null,
      shiftTitle: p.shiftTitle ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      releasedAt: p.releasedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    res.json({ data, total: all.length, page, limit, pendingCount, escrowedCount, totalEscrowedVolume });
  } catch (err) {
    req.log.error({ err }, "Admin list payments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/payments/:id/release", authenticate, requireRole("platform_admin"), async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Payment not found" }); return; }
    if (!["escrowed", "pending"].includes(existing.status)) {
      res.status(400).json({ error: `Cannot release a payment with status: ${existing.status}` });
      return;
    }

    const mpesaTransactionId = req.body?.mpesaTransactionId ?? existing.mpesaTransactionId;

    const [payment] = await db.update(paymentsTable).set({
      status: "completed" as any,
      releasedAt: new Date(),
      mpesaTransactionId: mpesaTransactionId ?? null,
      updatedAt: new Date(),
    }).where(eq(paymentsTable.id, id)).returning();

    // Notify the locum
    const [booking] = await db
      .select({ locumId: bookingsTable.locumId })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, payment.bookingId))
      .limit(1);
    if (booking) {
      const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, booking.locumId)).limit(1);
      if (locum) {
        await db.insert(notificationsTable).values({
          userId: locum.userId,
          channel: "in_app",
          type: "payment_released",
          title: "Payment Released",
          content: `KES ${payment.locumPayout.toLocaleString()} has been released to your account.`,
        });
        sendToUser(locum.userId, { type: "payment_released", payload: { paymentId: payment.id, amount: payment.locumPayout } });
      }
    }

    res.json({ ...payment, locumName: "", clinicName: "", shiftDate: null, shiftTitle: null });
  } catch (err) {
    req.log.error({ err }, "Admin release payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
