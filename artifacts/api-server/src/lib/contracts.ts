/**
 * LocumLink Kenya — Digital Contract Generator
 *
 * Generates PDF service agreements for confirmed bookings.
 * Uses a lightweight HTML→PDF approach via node-html-to-image / puppeteer-free
 * method: builds an HTML string, returns it as a data URI or saves it to storage.
 *
 * The contract captures:
 *   - Parties: Clinic and Locum details
 *   - Shift details: date, time, location, specialty
 *   - Payment terms: rate, platform fee, payout timeline
 *   - Obligations: attendance, reporting, confidentiality
 *   - Governing law: Laws of Kenya
 *   - Signature blocks with timestamps
 */

export interface ContractParties {
  clinicName: string;
  clinicAddress: string;
  clinicContact: string;
  clinicRegistration: string;
  locumName: string;
  locumRegistration: string;
  locumRegistrationBody: string;
  locumPhone: string;
}

export interface ContractShift {
  date: string;          // e.g. "2026-05-10"
  startTime: string;     // e.g. "08:00"
  endTime: string;       // e.g. "14:00"
  specialty: string;
  description: string;
  location: string;
}

export interface ContractPayment {
  grossRate: number;     // KES
  platformFee: number;   // KES
  locumPayout: number;   // KES
  paymentMethod: string;
}

export interface ContractSignatures {
  clinicSignedAt?: Date | null;
  locumSignedAt?: Date | null;
}

export interface ContractOptions {
  bookingId: number;
  contractRef: string;   // e.g. "LL-2026-00042"
  parties: ContractParties;
  shift: ContractShift;
  payment: ContractPayment;
  signatures: ContractSignatures;
  generatedAt: Date;
}

export function generateContractRef(bookingId: number): string {
  const year = new Date().getFullYear();
  return `LL-${year}-${String(bookingId).padStart(5, "0")}`;
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function formatSignature(name: string, signedAt: Date | null | undefined): string {
  if (!signedAt) {
    return `
      <div class="sig-block">
        <div class="sig-line"></div>
        <p class="sig-name">${name}</p>
        <p class="sig-status pending">Awaiting signature</p>
      </div>
    `;
  }
  return `
    <div class="sig-block signed">
      <p class="sig-stamp">Digitally signed</p>
      <p class="sig-name">${name}</p>
      <p class="sig-date">${signedAt.toLocaleString("en-KE", { dateStyle: "long", timeStyle: "short" })}</p>
      <p class="sig-status signed">Signed via LocumLink Kenya</p>
    </div>
  `;
}

/**
 * Generate a complete contract as an HTML string (can be rendered in browser or converted to PDF)
 */
export function generateContractHtml(opts: ContractOptions): string {
  const { bookingId, contractRef, parties, shift, payment, signatures, generatedAt } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LocumLink Service Agreement — ${contractRef}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 48px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d7a5f; padding-bottom: 20px; margin-bottom: 28px; }
  .logo { font-family: 'Arial', sans-serif; font-size: 22px; font-weight: 800; color: #0d7a5f; letter-spacing: -0.5px; }
  .logo span { color: #f59e0b; }
  .contract-ref { text-align: right; font-size: 11px; color: #666; }
  .contract-ref strong { display: block; font-size: 14px; color: #1a1a1a; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 6px; color: #0d7a5f; text-transform: uppercase; letter-spacing: 1px; }
  .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 32px; }
  h2 { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0d7a5f; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; margin: 24px 0 12px; }
  .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 8px; }
  .party-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; }
  .party-box h3 { font-size: 11px; text-transform: uppercase; color: #0d7a5f; margin-bottom: 8px; letter-spacing: 0.5px; }
  .party-box p { font-size: 12px; margin-bottom: 3px; }
  .party-box .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; color: #6b7280; padding: 6px 8px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  td { padding: 8px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
  .amount { font-weight: bold; }
  .payout { color: #0d7a5f; font-weight: bold; font-size: 14px; }
  ol { padding-left: 18px; }
  ol li { margin-bottom: 8px; font-size: 12px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px; }
  .sig-block { border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; min-height: 90px; }
  .sig-block.signed { border-color: #bbf7d0; background: #f0fdf4; }
  .sig-line { border-bottom: 1px solid #9ca3af; margin-bottom: 8px; height: 32px; }
  .sig-name { font-weight: bold; font-size: 12px; }
  .sig-date { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .sig-stamp { font-family: Arial, sans-serif; font-size: 13px; color: #0d7a5f; font-weight: bold; margin-bottom: 4px; }
  .sig-status { font-size: 10px; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
  .sig-status.pending { color: #f59e0b; }
  .sig-status.signed { color: #0d7a5f; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  .highlight { background: #fef3c7; padding: 2px 4px; border-radius: 3px; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo">Locum<span>Link</span> Kenya</div>
  <div class="contract-ref">
    <strong>${contractRef}</strong>
    Service Agreement<br>
    Generated: ${generatedAt.toLocaleDateString("en-KE", { dateStyle: "long" })}
  </div>
</div>

<h1>Locum Medical Services Agreement</h1>
<p class="subtitle">This agreement is entered into via the LocumLink Kenya platform and is binding upon digital signature by both parties.</p>

<h2>1. Parties</h2>
<div class="party-grid">
  <div class="party-box">
    <h3>The Facility (Employer for this Engagement)</h3>
    <p class="label">Name</p>
    <p><strong>${parties.clinicName}</strong></p>
    <p class="label">Address</p>
    <p>${parties.clinicAddress}</p>
    <p class="label">Contact</p>
    <p>${parties.clinicContact}</p>
    <p class="label">Registration</p>
    <p>${parties.clinicRegistration}</p>
  </div>
  <div class="party-box">
    <h3>The Locum Professional</h3>
    <p class="label">Name</p>
    <p><strong>${parties.locumName}</strong></p>
    <p class="label">Registration Number</p>
    <p>${parties.locumRegistration}</p>
    <p class="label">Licensing Body</p>
    <p>${parties.locumRegistrationBody}</p>
    <p class="label">Contact</p>
    <p>${parties.locumPhone}</p>
  </div>
</div>

<h2>2. Engagement Details</h2>
<table>
  <tr><th>Field</th><th>Details</th></tr>
  <tr><td>Date of Service</td><td><strong>${formatDate(shift.date)}</strong></td></tr>
  <tr><td>Hours</td><td>${shift.startTime} – ${shift.endTime}</td></tr>
  <tr><td>Specialty / Role</td><td>${shift.specialty}</td></tr>
  <tr><td>Location</td><td>${shift.location}</td></tr>
  <tr><td>Scope</td><td>${shift.description}</td></tr>
</table>

<h2>3. Remuneration</h2>
<table>
  <tr><th>Item</th><th>Amount</th></tr>
  <tr><td>Gross Service Fee</td><td class="amount">${formatKes(payment.grossRate)}</td></tr>
  <tr><td>Platform Service Charge (LocumLink Kenya, 10%)</td><td>${formatKes(payment.platformFee)}</td></tr>
  <tr><td><strong>Net Payout to Locum</strong></td><td class="payout">${formatKes(payment.locumPayout)}</td></tr>
  <tr><td>Payment Method</td><td>${payment.paymentMethod.toUpperCase()}</td></tr>
  <tr><td>Payment Timeline</td><td>Within 24 hours of shift completion confirmation by the Facility</td></tr>
</table>

<h2>4. Terms and Conditions</h2>
<ol>
  <li><strong>Independent Contractor:</strong> The Locum Professional is engaged as an independent contractor for this single engagement only. Nothing herein creates an employment relationship, partnership, or agency between the parties.</li>
  <li><strong>Professional Standards:</strong> The Locum Professional shall provide services in accordance with the standards set by their licensing body (${parties.locumRegistrationBody}) and all applicable Kenyan laws, including the Medical Practitioners and Dentists Act (Cap 253).</li>
  <li><strong>Attendance and Punctuality:</strong> The Locum Professional shall arrive at the Facility no later than 15 minutes before the scheduled start time. Failure to attend without 4 hours' prior notice constitutes a breach of this agreement and may result in a no-show penalty as determined by LocumLink Kenya's dispute policy.</li>
  <li><strong>Confidentiality:</strong> Both parties agree to maintain the confidentiality of all patient information in accordance with the Health Act 2017 and applicable data protection laws. Patient records may not be removed from the Facility's premises.</li>
  <li><strong>Indemnity:</strong> Each party shall be responsible for their own professional actions. The Facility is responsible for ensuring adequate professional indemnity cover for the engagement period. The Locum Professional is responsible for maintaining their own professional indemnity insurance.</li>
  <li><strong>Cancellation:</strong> Either party may cancel this engagement with at least 24 hours' notice via the LocumLink platform. Cancellations within 24 hours of the shift start time may be subject to a cancellation fee.</li>
  <li><strong>Dispute Resolution:</strong> Any disputes arising from this agreement shall first be submitted to LocumLink Kenya's internal dispute resolution process. Unresolved disputes shall be subject to arbitration under the Arbitration Act (Cap 49) of Kenya.</li>
  <li><strong>Governing Law:</strong> This agreement is governed by the laws of the Republic of Kenya. The parties submit to the non-exclusive jurisdiction of the Kenyan courts.</li>
  <li><strong>Platform Terms:</strong> Both parties acknowledge they have read and agreed to LocumLink Kenya's Terms of Service, which are incorporated herein by reference.</li>
</ol>

<h2>5. Signatures</h2>
<p style="font-size: 12px; margin-bottom: 16px;">By signing below, each party confirms they have read, understood, and agree to be bound by this agreement. Digital signatures via the LocumLink Kenya platform are legally binding under the Kenya Information and Communications Act (Cap 411A).</p>
<div class="sig-grid">
  ${formatSignature(`For ${parties.clinicName}`, signatures.clinicSignedAt ?? null)}
  ${formatSignature(parties.locumName, signatures.locumSignedAt ?? null)}
</div>

<div class="footer">
  LocumLink Kenya — Booking Reference: ${bookingId} — Contract Reference: ${contractRef}<br>
  This document was generated on ${generatedAt.toISOString()} and is stored securely on the LocumLink platform.<br>
  Disputes: disputes@locumlink.co.ke | Platform: locumlink.co.ke
</div>

</body>
</html>`;
}

/**
 * Generate a contract as a base64-encoded data URI (for embedding or download)
 */
export function generateContractDataUri(opts: ContractOptions): string {
  const html = generateContractHtml(opts);
  const encoded = Buffer.from(html).toString("base64");
  return `data:text/html;base64,${encoded}`;
}
