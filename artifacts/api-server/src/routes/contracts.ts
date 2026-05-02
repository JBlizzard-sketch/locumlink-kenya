import { Router } from "express";
import { db } from "@workspace/db";
import {
  bookingsTable,
  shiftsTable,
  locumsTable,
  clinicsTable,
  specialtiesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  generateContractHtml,
  generateContractDataUri,
  generateContractRef,
  ContractOptions,
} from "../lib/contracts";
import { authenticate } from "../middlewares/auth";

const router = Router();

/** GET /api/bookings/:id/contract — fetch or generate contract HTML */
router.get("/bookings/:id/contract", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, booking.shiftId)).limit(1);
    const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.id, booking.locumId)).limit(1);
    const [clinic] = shift ? await db.select().from(clinicsTable).where(eq(clinicsTable.id, shift.clinicId)).limit(1) : [null];
    const [specialty] = shift ? await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, shift.specialtyId)).limit(1) : [null];

    if (!shift || !locum || !clinic) {
      res.status(422).json({ error: "Incomplete booking data — cannot generate contract" });
      return;
    }

    const grossRate = booking.escrowAmount || 0;
    const platformFee = Math.round(grossRate * 0.1);
    const locumPayout = grossRate - platformFee;

    const opts: ContractOptions = {
      bookingId: id,
      contractRef: booking.contractRef || generateContractRef(id),
      parties: {
        clinicName: clinic.name,
        clinicAddress: `${clinic.address || ""}, ${clinic.subCounty || ""}, ${clinic.county || "Nairobi"}`,
        clinicContact: clinic.contactEmail || clinic.contactPhone || "",
        clinicRegistration: clinic.mohFacilityNumber || clinic.businessRegistration || "—",
        locumName: `${locum.firstName} ${locum.lastName}`,
        locumRegistration: locum.registrationNumber,
        locumRegistrationBody: locum.registrationBody,
        locumPhone: locum.mpesaNumber || "",
      },
      shift: {
        date: shift.shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        specialty: specialty?.name || "",
        description: shift.description || "",
        location: `${clinic.name} — ${clinic.address || ""}, ${clinic.subCounty || ""}`,
      },
      payment: {
        grossRate,
        platformFee,
        locumPayout,
        paymentMethod: "M-Pesa",
      },
      signatures: {
        clinicSignedAt: booking.contractSignedByClinicAt,
        locumSignedAt: booking.contractSignedByLocumAt,
      },
      generatedAt: new Date(),
    };

    // Save contract ref back to booking if not set
    if (!booking.contractRef) {
      await db.update(bookingsTable)
        .set({ contractRef: opts.contractRef, updatedAt: new Date() })
        .where(eq(bookingsTable.id, id));
    }

    const format = req.query.format as string;
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(generateContractHtml(opts));
    } else {
      res.json({
        contractRef: opts.contractRef,
        bookingId: id,
        contractUrl: generateContractDataUri(opts),
        contractSignedByClinicAt: booking.contractSignedByClinicAt,
        contractSignedByLocumAt: booking.contractSignedByLocumAt,
        fullyExecuted: !!(booking.contractSignedByClinicAt && booking.contractSignedByLocumAt),
      });
    }
  } catch (err) {
    req.log.error({ err }, "Contract generation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
