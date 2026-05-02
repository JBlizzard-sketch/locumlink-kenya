import { db } from "@workspace/db";
import {
  usersTable,
  specialtiesTable,
  clinicsTable,
  locumsTable,
  shiftsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding LocumLink Kenya database...");

  // Specialties
  const specialties = await db
    .insert(specialtiesTable)
    .values([
      { name: "General Practice", category: "Medical", suggestedRateMin: 8000, suggestedRateMax: 15000, description: "General outpatient consultations" },
      { name: "Anaesthesia", category: "Medical", suggestedRateMin: 20000, suggestedRateMax: 40000, description: "Anaesthetic cover for surgical lists" },
      { name: "Paediatrics", category: "Medical", suggestedRateMin: 12000, suggestedRateMax: 22000, description: "Child health and illness" },
      { name: "Obstetrics & Gynaecology", category: "Medical", suggestedRateMin: 15000, suggestedRateMax: 30000, description: "Maternal and women's health" },
      { name: "General Nursing", category: "Nursing", suggestedRateMin: 3000, suggestedRateMax: 7000, description: "Ward nursing and patient care" },
      { name: "ICU Nursing", category: "Nursing", suggestedRateMin: 5000, suggestedRateMax: 10000, description: "Intensive care unit nursing" },
      { name: "Clinical Officer", category: "Allied Health", suggestedRateMin: 4000, suggestedRateMax: 8000, description: "Primary clinical care" },
      { name: "Radiology", category: "Medical", suggestedRateMin: 18000, suggestedRateMax: 35000, description: "Diagnostic imaging interpretation" },
      { name: "Physiotherapy", category: "Allied Health", suggestedRateMin: 5000, suggestedRateMax: 12000, description: "Physical rehabilitation" },
      { name: "Dentistry", category: "Dental", suggestedRateMin: 10000, suggestedRateMax: 20000, description: "General dental procedures" },
      { name: "Emergency Medicine", category: "Medical", suggestedRateMin: 15000, suggestedRateMax: 28000, description: "Emergency and acute care" },
      { name: "Internal Medicine", category: "Medical", suggestedRateMin: 14000, suggestedRateMax: 25000, description: "Adult medicine consultations" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Seeded ${specialties.length} specialties`);

  // Admin user
  const adminHash = await bcrypt.hash("Admin@2024!", 12);
  const [adminUser] = await db
    .insert(usersTable)
    .values({ email: "admin@locumlink.co.ke", phone: "+254700000000", passwordHash: adminHash, role: "platform_admin" })
    .onConflictDoNothing()
    .returning();

  // Clinic users
  const clinicHash = await bcrypt.hash("Clinic@2024!", 12);
  const [clinicUser1] = await db
    .insert(usersTable)
    .values({ email: "hr@agakhanklinic.co.ke", phone: "+254711111111", passwordHash: clinicHash, role: "clinic_admin" })
    .onConflictDoNothing()
    .returning();

  const [clinicUser2] = await db
    .insert(usersTable)
    .values({ email: "admin@medplusnbi.co.ke", phone: "+254722222222", passwordHash: clinicHash, role: "clinic_admin" })
    .onConflictDoNothing()
    .returning();

  const [clinicUser3] = await db
    .insert(usersTable)
    .values({ email: "info@karenmedical.co.ke", phone: "+254733333333", passwordHash: clinicHash, role: "clinic_admin" })
    .onConflictDoNothing()
    .returning();

  // Locum users
  const locumHash = await bcrypt.hash("Locum@2024!", 12);
  const [locumUser1] = await db
    .insert(usersTable)
    .values({ email: "dr.wanjiku@gmail.com", phone: "+254744444444", passwordHash: locumHash, role: "locum" })
    .onConflictDoNothing()
    .returning();

  const [locumUser2] = await db
    .insert(usersTable)
    .values({ email: "nurse.otieno@gmail.com", phone: "+254755555555", passwordHash: locumHash, role: "locum" })
    .onConflictDoNothing()
    .returning();

  const [locumUser3] = await db
    .insert(usersTable)
    .values({ email: "dr.mwangi@gmail.com", phone: "+254766666666", passwordHash: locumHash, role: "locum" })
    .onConflictDoNothing()
    .returning();

  console.log("Users seeded");

  const gpId = specialties.find(s => s.name === "General Practice")?.id || 1;
  const nurseId = specialties.find(s => s.name === "General Nursing")?.id || 5;
  const anaesId = specialties.find(s => s.name === "Anaesthesia")?.id || 2;

  // Clinics
  if (clinicUser1) {
    await db.insert(clinicsTable).values({
      userId: clinicUser1.id,
      name: "Aga Khan Primary Care — Westlands",
      slug: "aga-khan-westlands",
      facilityType: "specialist_clinic",
      address: "The Pavilion, Ground Floor, Westlands",
      subCounty: "Westlands",
      county: "Nairobi",
      contactName: "Dr. Fatuma Osman",
      contactEmail: "hr@agakhanklinic.co.ke",
      contactPhone: "+254711111111",
      mohFacilityNumber: "NBI-0012345",
      verificationStatus: "verified",
      payerScore: "4.7",
      totalShiftsPosted: 24,
      totalShiftsFilled: 21,
      bio: "Aga Khan Primary Care — Westlands is a multi-specialty outpatient facility serving Nairobi's Westlands and Parklands neighborhoods.",
    }).onConflictDoNothing();
  }

  if (clinicUser2) {
    await db.insert(clinicsTable).values({
      userId: clinicUser2.id,
      name: "MedPlus Clinic — Upperhill",
      slug: "medplus-upperhill",
      facilityType: "general_practice",
      address: "Rahimtulla Tower, Upper Hill Road",
      subCounty: "Starehe",
      county: "Nairobi",
      contactName: "Ms. Grace Njeri",
      contactEmail: "admin@medplusnbi.co.ke",
      contactPhone: "+254722222222",
      mohFacilityNumber: "NBI-0067890",
      verificationStatus: "verified",
      payerScore: "4.2",
      totalShiftsPosted: 12,
      totalShiftsFilled: 9,
      bio: "MedPlus Clinic is a busy outpatient clinic in Upperhill serving corporate clients and Nairobi CBD workers.",
    }).onConflictDoNothing();
  }

  if (clinicUser3) {
    await db.insert(clinicsTable).values({
      userId: clinicUser3.id,
      name: "Karen Medical Centre",
      slug: "karen-medical",
      facilityType: "general_practice",
      address: "Karen Shopping Centre, Karen Road",
      subCounty: "Karen",
      county: "Nairobi",
      contactName: "Dr. James Ndirangu",
      contactEmail: "info@karenmedical.co.ke",
      contactPhone: "+254733333333",
      verificationStatus: "pending",
      payerScore: "0",
      totalShiftsPosted: 0,
      totalShiftsFilled: 0,
      bio: "Karen Medical Centre is a new multi-specialty clinic serving the Karen and Langata areas.",
    }).onConflictDoNothing();
  }

  console.log("Clinics seeded");

  // Locums
  if (locumUser1) {
    await db.insert(locumsTable).values({
      userId: locumUser1.id,
      firstName: "Dr. Grace",
      lastName: "Wanjiku",
      bio: "GP with 8 years of experience in outpatient and emergency care. Available for Saturday and Sunday shifts across Nairobi.",
      primarySpecialtyId: gpId,
      registrationNumber: "KMPDC/12345/2016",
      registrationBody: "KMPDC",
      yearsExperience: 8,
      mpesaNumber: "+254744444444",
      preferredRatePerShift: 12000,
      verificationStatus: "verified",
      reliabilityScore: "4.8",
      totalShiftsCompleted: 34,
      isAvailableForUrgent: true,
      subCounty: "Kilimani",
      county: "Nairobi",
    }).onConflictDoNothing();
  }

  if (locumUser2) {
    await db.insert(locumsTable).values({
      userId: locumUser2.id,
      firstName: "Nurse",
      lastName: "Patrick Otieno",
      bio: "ICU-trained nurse with 5 years experience. Available for evening and night shifts.",
      primarySpecialtyId: nurseId,
      registrationNumber: "NCK/78901/2019",
      registrationBody: "NCK",
      yearsExperience: 5,
      mpesaNumber: "+254755555555",
      preferredRatePerShift: 5000,
      verificationStatus: "verified",
      reliabilityScore: "4.5",
      totalShiftsCompleted: 18,
      isAvailableForUrgent: false,
      subCounty: "Embakasi",
      county: "Nairobi",
    }).onConflictDoNothing();
  }

  if (locumUser3) {
    await db.insert(locumsTable).values({
      userId: locumUser3.id,
      firstName: "Dr. Samuel",
      lastName: "Mwangi",
      bio: "Anaesthetist with 12 years experience. Handles elective and emergency surgical lists. KNH trained.",
      primarySpecialtyId: anaesId,
      registrationNumber: "KMPDC/56789/2012",
      registrationBody: "KMPDC",
      yearsExperience: 12,
      mpesaNumber: "+254766666666",
      preferredRatePerShift: 28000,
      verificationStatus: "pending",
      reliabilityScore: "0",
      totalShiftsCompleted: 0,
      isAvailableForUrgent: false,
      subCounty: "Lavington",
      county: "Nairobi",
    }).onConflictDoNothing();
  }

  console.log("Locums seeded");

  // Shifts
  const [clinic1] = await db.select().from(clinicsTable).limit(1);
  if (clinic1) {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 3);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

    await db.insert(shiftsTable).values([
      {
        clinicId: clinic1.id,
        specialtyId: gpId,
        title: "Saturday GP Cover — Westlands",
        description: "Busy Saturday morning outpatient session. Expected 30–40 patients. EPIC EMR system in use.",
        shiftDate: tomorrow.toISOString().split("T")[0],
        startTime: "08:00",
        endTime: "14:00",
        rate: 12000,
        positionsAvailable: 1,
        urgency: "normal",
        status: "open",
        minYearsExperience: 3,
      },
      {
        clinicId: clinic1.id,
        specialtyId: nurseId,
        title: "Night Shift Nurse — General Ward",
        description: "Night nursing cover for 20-bed general ward. Must be comfortable with IV line management and vitals monitoring.",
        shiftDate: dayAfter.toISOString().split("T")[0],
        startTime: "19:00",
        endTime: "07:00",
        rate: 5500,
        positionsAvailable: 2,
        urgency: "urgent",
        status: "open",
        minYearsExperience: 2,
      },
      {
        clinicId: clinic1.id,
        specialtyId: anaesId,
        title: "Emergency: Anaesthetist Needed — Sunday",
        description: "Surgical list scheduled including 2 laparotomies and 1 C-section. Full anaesthetic workup required.",
        shiftDate: nextWeek.toISOString().split("T")[0],
        startTime: "07:00",
        endTime: "17:00",
        rate: 30000,
        positionsAvailable: 1,
        urgency: "emergency",
        status: "open",
        minYearsExperience: 5,
        specificRequirements: "Must have experience with obstetric anaesthesia",
      },
    ]).onConflictDoNothing();
  }

  console.log("Shifts seeded");
  console.log("\nSeed complete!");
  console.log("\nDemo credentials:");
  console.log("  Admin:  admin@locumlink.co.ke / Admin@2024!");
  console.log("  Clinic: hr@agakhanklinic.co.ke / Clinic@2024!");
  console.log("  Locum:  dr.wanjiku@gmail.com / Locum@2024!");
}

seed().catch(console.error).finally(() => process.exit(0));
