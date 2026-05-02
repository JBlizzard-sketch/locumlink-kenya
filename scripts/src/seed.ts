import { db } from "@workspace/db";
import {
  usersTable,
  specialtiesTable,
  clinicsTable,
  locumsTable,
  shiftsTable,
  bookingsTable,
  paymentsTable,
  ratingsTable,
  notificationsTable,
  shiftApplicationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function subDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() - n); return r; }
function dateStr(d: Date) { return d.toISOString().split("T")[0]; }

async function seed() {
  console.log("🌱 Seeding LocumLink Kenya database...");

  // ─── SPECIALTIES ────────────────────────────────────────────────────────────
  const specialties = await db.insert(specialtiesTable).values([
    { name: "General Practice",          category: "Medical",       suggestedRateMin: 8000,  suggestedRateMax: 15000, description: "General outpatient consultations" },
    { name: "Anaesthesia",               category: "Medical",       suggestedRateMin: 20000, suggestedRateMax: 40000, description: "Anaesthetic cover for surgical lists" },
    { name: "Paediatrics",               category: "Medical",       suggestedRateMin: 12000, suggestedRateMax: 22000, description: "Child health and illness" },
    { name: "Obstetrics & Gynaecology",  category: "Medical",       suggestedRateMin: 15000, suggestedRateMax: 30000, description: "Maternal and women's health" },
    { name: "General Nursing",           category: "Nursing",       suggestedRateMin: 3000,  suggestedRateMax: 7000,  description: "Ward nursing and patient care" },
    { name: "ICU Nursing",               category: "Nursing",       suggestedRateMin: 5000,  suggestedRateMax: 10000, description: "Intensive care unit nursing" },
    { name: "Clinical Officer",          category: "Allied Health", suggestedRateMin: 4000,  suggestedRateMax: 8000,  description: "Primary clinical care" },
    { name: "Radiology",                 category: "Medical",       suggestedRateMin: 18000, suggestedRateMax: 35000, description: "Diagnostic imaging interpretation" },
    { name: "Physiotherapy",             category: "Allied Health", suggestedRateMin: 5000,  suggestedRateMax: 12000, description: "Physical rehabilitation" },
    { name: "Dentistry",                 category: "Dental",        suggestedRateMin: 10000, suggestedRateMax: 20000, description: "General dental procedures" },
    { name: "Emergency Medicine",        category: "Medical",       suggestedRateMin: 15000, suggestedRateMax: 28000, description: "Emergency and acute care" },
    { name: "Internal Medicine",         category: "Medical",       suggestedRateMin: 14000, suggestedRateMax: 25000, description: "Adult medicine consultations" },
  ]).onConflictDoNothing().returning();

  console.log(`  ✓ ${specialties.length} specialties`);

  const gpId    = specialties.find(s => s.name === "General Practice")?.id ?? 1;
  const nurseId = specialties.find(s => s.name === "General Nursing")?.id  ?? 5;
  const anaesId = specialties.find(s => s.name === "Anaesthesia")?.id       ?? 2;
  const paedId  = specialties.find(s => s.name === "Paediatrics")?.id       ?? 3;
  const icuId   = specialties.find(s => s.name === "ICU Nursing")?.id       ?? 6;
  const emId    = specialties.find(s => s.name === "Emergency Medicine")?.id ?? 11;

  // ─── USERS (upsert-style: insert then fetch) ─────────────────────────────────
  const adminHash  = await bcrypt.hash("Admin@2024!",  12);
  const clinicHash = await bcrypt.hash("Clinic@2024!", 12);
  const locumHash  = await bcrypt.hash("Locum@2024!",  12);

  async function upsertUser(email: string, phone: string, hash: string, role: string) {
    await db.insert(usersTable).values({ email, phone, passwordHash: hash, role: role as any }).onConflictDoNothing();
    const [u] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return u;
  }

  const cu1 = await upsertUser("hr@agakhanklinic.co.ke",  "+254711111111", clinicHash, "clinic_admin");
  const cu2 = await upsertUser("admin@medplusnbi.co.ke",  "+254722222222", clinicHash, "clinic_admin");
  const cu3 = await upsertUser("info@karenmedical.co.ke", "+254733333333", clinicHash, "clinic_admin");
  const lu1 = await upsertUser("dr.wanjiku@gmail.com",    "+254744444444", locumHash,  "locum");
  const lu2 = await upsertUser("nurse.otieno@gmail.com",  "+254755555555", locumHash,  "locum");
  const lu3 = await upsertUser("dr.mwangi@gmail.com",     "+254766666666", locumHash,  "locum");
  const lu4 = await upsertUser("dr.kamau@gmail.com",      "+254777777777", locumHash,  "locum");
  await upsertUser("admin@locumlink.co.ke", "+254700000000", adminHash, "platform_admin");

  console.log("  ✓ users");

  // ─── CLINICS ─────────────────────────────────────────────────────────────────
  await db.insert(clinicsTable).values({
    userId: cu1.id, name: "Aga Khan Primary Care — Westlands", slug: "aga-khan-westlands",
    facilityType: "specialist_clinic", address: "The Pavilion, Westlands", subCounty: "Westlands", county: "Nairobi",
    contactName: "Dr. Fatuma Osman", contactEmail: "hr@agakhanklinic.co.ke", contactPhone: "+254711111111",
    mohFacilityNumber: "NBI-0012345", verificationStatus: "verified", payerScore: "4.7",
    totalShiftsPosted: 24, totalShiftsFilled: 21,
    bio: "Multi-specialty outpatient facility serving Westlands and Parklands.",
  }).onConflictDoNothing();

  await db.insert(clinicsTable).values({
    userId: cu2.id, name: "MedPlus Clinic — Upperhill", slug: "medplus-upperhill",
    facilityType: "general_practice", address: "Rahimtulla Tower, Upper Hill Road", subCounty: "Starehe", county: "Nairobi",
    contactName: "Ms. Grace Njeri", contactEmail: "admin@medplusnbi.co.ke", contactPhone: "+254722222222",
    mohFacilityNumber: "NBI-0067890", verificationStatus: "verified", payerScore: "4.2",
    totalShiftsPosted: 12, totalShiftsFilled: 9,
    bio: "Busy outpatient clinic in Upperhill serving corporate clients.",
  }).onConflictDoNothing();

  await db.insert(clinicsTable).values({
    userId: cu3.id, name: "Karen Medical Centre", slug: "karen-medical",
    facilityType: "general_practice", address: "Karen Shopping Centre, Karen Road", subCounty: "Karen", county: "Nairobi",
    contactName: "Dr. James Ndirangu", contactEmail: "info@karenmedical.co.ke", contactPhone: "+254733333333",
    verificationStatus: "pending", payerScore: "0", totalShiftsPosted: 0, totalShiftsFilled: 0,
    bio: "New multi-specialty clinic serving Karen and Langata.",
  }).onConflictDoNothing();

  const [clinic1] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, cu1.id)).limit(1);
  const [clinic2] = await db.select().from(clinicsTable).where(eq(clinicsTable.userId, cu2.id)).limit(1);

  console.log("  ✓ clinics");

  // ─── LOCUMS ──────────────────────────────────────────────────────────────────
  await db.insert(locumsTable).values({
    userId: lu1.id, firstName: "Grace", lastName: "Wanjiku",
    bio: "GP with 8 years of outpatient and emergency experience. Available weekends across Nairobi.",
    primarySpecialtyId: gpId, registrationNumber: "KMPDC/12345/2016", registrationBody: "KMPDC",
    yearsExperience: 8, mpesaNumber: "+254744444444", preferredRatePerShift: 12000,
    verificationStatus: "verified", reliabilityScore: "4.8", totalShiftsCompleted: 34,
    isAvailableForUrgent: true, subCounty: "Kilimani", county: "Nairobi",
  }).onConflictDoNothing();

  await db.insert(locumsTable).values({
    userId: lu2.id, firstName: "Patrick", lastName: "Otieno",
    bio: "ICU-trained nurse with 5 years experience. Available evenings and nights.",
    primarySpecialtyId: nurseId, registrationNumber: "NCK/78901/2019", registrationBody: "NCK",
    yearsExperience: 5, mpesaNumber: "+254755555555", preferredRatePerShift: 5000,
    verificationStatus: "verified", reliabilityScore: "4.5", totalShiftsCompleted: 18,
    isAvailableForUrgent: false, subCounty: "Embakasi", county: "Nairobi",
  }).onConflictDoNothing();

  await db.insert(locumsTable).values({
    userId: lu3.id, firstName: "Samuel", lastName: "Mwangi",
    bio: "Anaesthetist with 12 years experience. Elective and emergency surgical lists. KNH trained.",
    primarySpecialtyId: anaesId, registrationNumber: "KMPDC/56789/2012", registrationBody: "KMPDC",
    yearsExperience: 12, mpesaNumber: "+254766666666", preferredRatePerShift: 28000,
    verificationStatus: "pending", reliabilityScore: "0", totalShiftsCompleted: 0,
    isAvailableForUrgent: false, subCounty: "Lavington", county: "Nairobi",
  }).onConflictDoNothing();

  await db.insert(locumsTable).values({
    userId: lu4.id, firstName: "Esther", lastName: "Kamau",
    bio: "Paediatrician with 6 years experience in busy public and private hospitals.",
    primarySpecialtyId: paedId, registrationNumber: "KMPDC/99012/2018", registrationBody: "KMPDC",
    yearsExperience: 6, mpesaNumber: "+254777777777", preferredRatePerShift: 16000,
    verificationStatus: "verified", reliabilityScore: "4.7", totalShiftsCompleted: 22,
    isAvailableForUrgent: true, subCounty: "Kileleshwa", county: "Nairobi",
  }).onConflictDoNothing();

  const [locum1] = await db.select().from(locumsTable).where(eq(locumsTable.userId, lu1.id)).limit(1);
  const [locum2] = await db.select().from(locumsTable).where(eq(locumsTable.userId, lu2.id)).limit(1);

  console.log("  ✓ locums");

  if (!clinic1) {
    console.log("  ⚠ No clinic1 — shifts/bookings skipped (already seeded?)");
    console.log("\n✅ Seed complete!");
    return;
  }

  const today = new Date();

  // ─── SHIFTS ──────────────────────────────────────────────────────────────────
  // 6 open + 8 historical completed = 14 shifts for 6-month analytics data
  const existingShifts = await db.select().from(shiftsTable).where(eq(shiftsTable.clinicId, clinic1.id));
  let shiftRows;
  if (existingShifts.length >= 14) {
    console.log("  ✓ shifts (already seeded — using existing)");
    shiftRows = existingShifts;
  } else {
    shiftRows = await db.insert(shiftsTable).values([
      // ── Future / open shifts ─────────────────────────────────────────
      { clinicId: clinic1.id, specialtyId: gpId,    title: "Saturday GP Cover — Westlands",        description: "Busy Saturday outpatient session. 30–40 patients. EPIC EMR in use.", shiftDate: dateStr(addDays(today, 2)),  startTime: "08:00", endTime: "14:00", rate: 12000, positionsAvailable: 1, urgency: "normal",    status: "open", minYearsExperience: 3 },
      { clinicId: clinic1.id, specialtyId: nurseId,  title: "Night Shift Nurse — General Ward",      description: "Night nursing cover for 20-bed general ward. IV line management required.", shiftDate: dateStr(addDays(today, 4)),  startTime: "19:00", endTime: "07:00", rate: 5500,  positionsAvailable: 2, urgency: "urgent",    status: "open", minYearsExperience: 2 },
      { clinicId: clinic1.id, specialtyId: anaesId,  title: "Emergency: Anaesthetist Needed",         description: "Surgical list: 2 laparotomies + 1 C-section. Full anaesthetic workup required.", shiftDate: dateStr(addDays(today, 7)),  startTime: "07:00", endTime: "17:00", rate: 30000, positionsAvailable: 1, urgency: "emergency", status: "open", minYearsExperience: 5, specificRequirements: "Obstetric anaesthesia experience required" },
      { clinicId: clinic2?.id ?? clinic1.id, specialtyId: paedId,   title: "Paediatrics Weekend Clinic",           description: "Saturday paediatric OPD. High volume. Bring your stethoscope!", shiftDate: dateStr(addDays(today, 9)),  startTime: "09:00", endTime: "15:00", rate: 15000, positionsAvailable: 1, urgency: "normal",    status: "open", minYearsExperience: 4 },
      { clinicId: clinic2?.id ?? clinic1.id, specialtyId: icuId,    title: "ICU Nurse — Overnight Cover",          description: "3-bed ICU overnight nursing. Ventilator-competent nurses preferred.", shiftDate: dateStr(addDays(today, 5)),  startTime: "20:00", endTime: "08:00", rate: 8500,  positionsAvailable: 1, urgency: "urgent",    status: "open", minYearsExperience: 3 },
      { clinicId: clinic2?.id ?? clinic1.id, specialtyId: emId,     title: "Emergency Physician — Public Holiday", description: "Emergency cover for the public holiday weekend. Fast-paced environment.", shiftDate: dateStr(addDays(today, 14)), startTime: "08:00", endTime: "20:00", rate: 22000, positionsAvailable: 1, urgency: "normal",    status: "open", minYearsExperience: 5 },
      // ── Historical completed shifts — spread across 6 months ─────────
      // April (30 days ago)
      { clinicId: clinic1.id, specialtyId: gpId,    title: "GP Cover — April",            description: "April cover.", shiftDate: dateStr(subDays(today, 30)),  startTime: "09:00", endTime: "15:00", rate: 13000, positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 3 },
      // March (60 days ago)
      { clinicId: clinic1.id, specialtyId: gpId,    title: "GP Cover — March Weekend",    description: "March weekend outpatient cover.", shiftDate: dateStr(subDays(today, 60)),  startTime: "08:00", endTime: "14:00", rate: 12000, positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 3 },
      // February (90 days ago)
      { clinicId: clinic1.id, specialtyId: gpId,    title: "GP Cover — February",         description: "February weekend cover.", shiftDate: dateStr(subDays(today, 90)),  startTime: "08:00", endTime: "14:00", rate: 11000, positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 3 },
      // January (120 days ago)
      { clinicId: clinic1.id, specialtyId: nurseId,  title: "Night Nurse — January",       description: "January night nursing.", shiftDate: dateStr(subDays(today, 120)), startTime: "19:00", endTime: "07:00", rate: 5000,  positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 2 },
      // December 2025 (150 days ago)
      { clinicId: clinic1.id, specialtyId: gpId,    title: "GP Cover — December",         description: "December end-of-year cover.", shiftDate: dateStr(subDays(today, 150)), startTime: "08:00", endTime: "14:00", rate: 14000, positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 3 },
      // December 2025 second (170 days ago)
      { clinicId: clinic1.id, specialtyId: paedId,  title: "Paeds Cover — December",      description: "December paediatric cover.", shiftDate: dateStr(subDays(today, 170)), startTime: "09:00", endTime: "15:00", rate: 15000, positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 4 },
      // November 2025 (200 days ago)
      { clinicId: clinic1.id, specialtyId: gpId,    title: "GP Cover — November",         description: "November weekend cover.", shiftDate: dateStr(subDays(today, 200)), startTime: "08:00", endTime: "14:00", rate: 11500, positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 3 },
      // November 2025 second (215 days ago)
      { clinicId: clinic1.id, specialtyId: nurseId, title: "Night Nurse — November",      description: "November overnight nursing.", shiftDate: dateStr(subDays(today, 215)), startTime: "19:00", endTime: "07:00", rate: 4800,  positionsAvailable: 1, urgency: "normal", status: "completed", minYearsExperience: 2 },
    ]).onConflictDoNothing().returning();
    console.log(`  ✓ ${shiftRows.length} shifts`);
  }

  if (!locum1 || shiftRows.length < 7) {
    console.log("\n✅ Seed complete (partial — no historical bookings)");
    return;
  }

  // ─── HISTORICAL BOOKINGS + PAYMENTS + RATINGS ────────────────────────────────
  // indexes: [0-5] = open shifts, [6-13] = historical completed
  const histShifts = shiftRows.slice(6);   // up to 8 historical shifts

  const histBookings: Array<typeof bookingsTable.$inferSelect | undefined> = [];
  const histData = [
    // { daysAgo for booking, daysAgo for payment, locum, rate }
    { bookDays: 31, payDays: 29, locum: locum1, rate: 13000 },   // Apr
    { bookDays: 61, payDays: 59, locum: locum1, rate: 12000 },   // Mar
    { bookDays: 91, payDays: 89, locum: locum1, rate: 11000 },   // Feb
    { bookDays: 121, payDays: 119, locum: locum2, rate: 5000 },  // Jan
    { bookDays: 151, payDays: 149, locum: locum1, rate: 14000 }, // Dec
    { bookDays: 171, payDays: 169, locum: locum1, rate: 15000 }, // Dec 2
    { bookDays: 201, payDays: 199, locum: locum1, rate: 11500 }, // Nov
    { bookDays: 216, payDays: 214, locum: locum2, rate: 4800 },  // Nov 2
  ];

  for (let i = 0; i < Math.min(histShifts.length, histData.length); i++) {
    const { bookDays, locum, rate, payDays } = histData[i];
    if (!locum) { histBookings.push(undefined); continue; }
    const [bk] = await db.insert(bookingsTable).values({
      shiftId: histShifts[i].id, locumId: locum.id,
      status: "completed",
      contractSignedByLocumAt: subDays(today, bookDays + 1),
      contractSignedByClinicAt: subDays(today, bookDays + 1),
      checkedInAt: subDays(today, bookDays),
      completedAt: subDays(today, bookDays),
    }).onConflictDoNothing().returning();
    histBookings.push(bk);

    if (bk) {
      const platformFee = Math.round(rate * 0.1);
      const locumPayout = rate - platformFee;
      await db.insert(paymentsTable).values({
        bookingId: bk.id,
        grossAmount: rate, platformFee, locumPayout,
        status: "completed", paymentMethod: "mpesa",
        paidAt: subDays(today, payDays),
      }).onConflictDoNothing();
    }
  }

  // A current confirmed booking for the demo locum
  const futureShift = shiftRows[0];
  await db.insert(bookingsTable).values({
    shiftId: futureShift.id, locumId: locum1.id, status: "confirmed",
  }).onConflictDoNothing();

  console.log("  ✓ bookings");
  console.log("  ✓ payments");

  // Ratings for completed bookings
  const ratingComments = [
    "Dr. Wanjiku was exceptional — punctual, thorough, and the patients loved her.",
    "Outstanding as always. Highly recommended for any GP cover shifts.",
    "Excellent consultation quality and very good patient rapport.",
    "Patrick was professional and competent throughout the night shift.",
    "Great work during a busy December period. Patients were very satisfied.",
    "Dr. Wanjiku handled a complex paediatric case brilliantly. Will re-book.",
    "Reliable and efficient. She fitted in with the team immediately.",
    "Patrick kept the ward running smoothly through the night. Excellent.",
  ];

  for (let i = 0; i < Math.min(histBookings.length, ratingComments.length); i++) {
    const bk = histBookings[i];
    if (!bk) continue;
    await db.insert(ratingsTable).values({
      bookingId: bk.id, raterType: "clinic",
      overallScore: i === 3 || i === 7 ? 4 : 5,
      comment: ratingComments[i],
    }).onConflictDoNothing();
  }

  console.log("  ✓ ratings");

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
  if (lu1) {
    await db.insert(notificationsTable).values([
      { userId: lu1.id, channel: "in_app", type: "booking_confirmed",  title: "Booking Confirmed",       content: "Your booking for 'Saturday GP Cover — Westlands' has been confirmed. Please sign the contract.", status: "sent" },
      { userId: lu1.id, channel: "in_app", type: "new_shift",          title: "New Shift Match",          content: "A new urgent shift at Karen Hospital matches your specialty — 92% match score!", status: "sent" },
      { userId: lu1.id, channel: "in_app", type: "shift_reminder",     title: "Shift Tomorrow",           content: "Reminder: You have a GP shift at Aga Khan Primary Care tomorrow at 07:00. Please check in 15 minutes early.", status: "sent" },
      { userId: lu1.id, channel: "in_app", type: "payment_received",   title: "Payment Released",         content: "KES 10,800 has been sent to your M-Pesa for the March weekend shift at Westlands Medical Centre.", status: "read" },
      { userId: lu1.id, channel: "in_app", type: "rating_received",    title: "New Rating",               content: "You received a 5-star rating from Aga Khan Primary Care. They noted: 'Punctual, professional, and excellent bedside manner.'", status: "read" },
      { userId: lu1.id, channel: "in_app", type: "application_update", title: "Application Shortlisted",  content: "Your application for 'Sunday Paeds Ward Cover — Parklands' has been shortlisted. The clinic will confirm within 24 hours.", status: "sent" },
    ]).onConflictDoNothing();
  }

  if (cu1) {
    await db.insert(notificationsTable).values([
      { userId: cu1.id, channel: "in_app", type: "application_received", title: "New Application",        content: "Dr. Grace Wanjiku has applied for 'Saturday GP Cover — Westlands'. 8 years experience, 92% match.", status: "sent" },
      { userId: cu1.id, channel: "in_app", type: "booking_confirmed",    title: "Shift Filled",            content: "Dr. Amina Ochieng has been confirmed for the Sunday Paeds shift. Contract sent for signature.", status: "sent" },
      { userId: cu1.id, channel: "in_app", type: "payment_received",     title: "Payment Processed",       content: "KES 10,800 escrow payment for Dr. Wanjiku's March shift has been released. Transaction ID: MP2024031502.", status: "read" },
    ]).onConflictDoNothing();
  }

  console.log("  ✓ notifications");

  // ─── APPLICATIONS (open shifts) ──────────────────────────────────────────────
  if (locum1 && shiftRows[1]) {
    await db.insert(shiftApplicationsTable).values({
      shiftId: shiftRows[1].id, locumId: locum1.id,
      coverMessage: "I have 8 years of GP experience and am comfortable with night ward work.",
    }).onConflictDoNothing();
  }

  console.log("  ✓ applications");

  console.log("\n✅ Seed complete!");
  console.log("\nDemo credentials:");
  console.log("  Admin:  admin@locumlink.co.ke  / Admin@2024!");
  console.log("  Clinic: hr@agakhanklinic.co.ke / Clinic@2024!");
  console.log("  Locum:  dr.wanjiku@gmail.com   / Locum@2024!");
}

seed().catch(console.error).finally(() => process.exit(0));
