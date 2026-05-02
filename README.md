# LocumLink Kenya

> The operating room for Kenya's medical staffing economy.

LocumLink Kenya is a production-grade two-sided marketplace connecting verified locum medical professionals — doctors, nurses, clinical officers — with private clinics in Nairobi. It handles the entire trust layer: credential verification, digital contracts, shift matching, M-Pesa escrow payments, ratings, and dispute resolution.

---

## Live Demo

| Role | Email | Password |
|------|-------|----------|
| Locum (GP, verified) | `dr.wanjiku@gmail.com` | `Locum@2024!` |
| Clinic admin (Aga Khan Westlands) | `hr@agakhanklinic.co.ke` | `Clinic@2024!` |
| Platform admin | `admin@locumlink.co.ke` | `Admin@2024!` |

---

## Architecture

```
locumlink-kenya/
├── artifacts/
│   ├── api-server/          # Express 5 REST API (TypeScript)
│   └── locumlink/           # React + Vite frontend (TypeScript)
├── lib/
│   ├── db/                  # Drizzle ORM schema + migrations (PostgreSQL)
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-zod/             # Generated Zod validation schemas
│   └── api-client-react/    # Generated TanStack Query hooks
└── scripts/
    └── src/seed.ts          # Database seed script
```

**Stack:**
- **Backend:** Express 5, TypeScript, Drizzle ORM, PostgreSQL, bcryptjs, jsonwebtoken
- **Frontend:** React 19, Vite, Wouter (routing), TanStack Query v5, Radix UI / shadcn, Tailwind CSS v4
- **Codegen:** OpenAPI → Orval → Zod schemas + React Query hooks (contract-first development)
- **Monorepo:** pnpm workspaces

---

## Features

### For Locum Medical Professionals
- **Shift discovery board** — browse open shifts filtered by specialty, date, rate, urgency
- **One-click application** with cover message
- **Application tracker** — applied / shortlisted / confirmed / rejected
- **Booking management** — digital contract signing, check-in, completion
- **Availability calendar** — set recurring availability slots
- **Earnings dashboard** — monthly earnings chart, by-specialty breakdown, KRA-ready gross income summary
- **Rating system** — receive ratings from clinics after each shift
- **Notification centre** — per-channel preferences (email, SMS, push)

### For Clinics
- **Post a shift** — specialty dropdown with market rate benchmark, urgency levels (normal / urgent / emergency)
- **Applicant review** — ranked by match score, shortlist / confirm / reject per applicant
- **Fill rate analytics** — spend by month, fill rate by specialty, time-to-fill, hardest-to-fill roles
- **Locum directory** — browse verified locums with reliability scores and specialty filters
- **Booking management** — track check-in, contract signing, payment release

### Platform / Admin
- **Credential verification queue** — review uploaded documents (KMPDC licence, NCK cert, practising certificates)
- **Dispute resolution** — raise, review, and resolve disputes with penalty enforcement
- **Platform analytics** — total locums / clinics / payments, pending verifications, open disputes

---

## Database Schema

10 tables managed with Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `users` | Authentication, roles (locum / clinic_admin / clinic_hr / platform_admin) |
| `specialties` | Medical specialties with suggested rate ranges |
| `clinics` | Clinic profiles, verification status, payer score |
| `locums` | Locum profiles, registration body, reliability score |
| `shifts` | Posted shifts with urgency, rate, status |
| `shift_applications` | Applications with match score and status |
| `bookings` | Confirmed bookings with contract and payment tracking |
| `payments` | M-Pesa escrow payments with platform fee split |
| `ratings` | Bidirectional ratings (locum ↔ clinic) |
| `disputes` | Dispute lifecycle with resolution and penalties |
| `notifications` | Per-user notifications with per-channel preferences |
| `audit_logs` | Immutable audit trail for all state changes |
| `availability_slots` | Locum availability calendar |
| `notification_preferences` | Per-user notification channel settings |

---

## API Reference

Full OpenAPI 3.1 specification lives at `lib/api-spec/openapi.yaml`.

**Base path:** `/api`

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Specialties | `GET /specialties`, `GET /specialties/:id` |
| Clinics | `GET /clinics`, `POST /clinics`, `GET /clinics/me`, `GET /clinics/:id`, `PATCH /clinics/:id` |
| Locums | `GET /locums`, `POST /locums`, `GET /locums/me`, `GET /locums/:id`, `PATCH /locums/:id` |
| Availability | `GET /locums/:id/availability`, `POST /locums/:id/availability` |
| Shifts | `GET /shifts`, `POST /shifts`, `GET /shifts/:id`, `PATCH /shifts/:id`, `DELETE /shifts/:id` |
| Applications | `GET /shifts/:shiftId/applications`, `POST /shifts/:shiftId/applications`, `POST /applications/:id/shortlist`, `POST /applications/:id/confirm`, `POST /applications/:id/reject`, `GET /applications/my` |
| Bookings | `GET /bookings`, `GET /bookings/:id`, `POST /bookings/:id/check-in`, `POST /bookings/:id/complete`, `POST /bookings/:id/sign-contract` |
| Payments | `GET /payments`, `GET /payments/:id`, `GET /payments/earnings-summary` |
| Ratings | `POST /bookings/:bookingId/rating`, `GET /bookings/:bookingId/rating`, `GET /locums/:id/ratings`, `GET /clinics/:id/ratings` |
| Disputes | `POST /disputes`, `GET /disputes`, `GET /disputes/:id` |
| Notifications | `GET /notifications`, `GET /notifications/preferences`, `PATCH /notifications/preferences`, `POST /notifications/:id/read` |
| Analytics | `GET /analytics/clinic`, `GET /analytics/locum`, `GET /analytics/platform-summary` |
| Admin | `GET /admin/verification-queue`, `POST /admin/locums/:id/verify`, `POST /admin/clinics/:id/verify`, `POST /admin/disputes/:id/resolve` |

---

## Local Development

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (or a `DATABASE_URL` connection string)

### Setup

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Fill in DATABASE_URL and SESSION_SECRET

# Push database schema
pnpm --filter @workspace/db run push

# Seed with demo data
pnpm --filter @workspace/scripts run seed

# Start both services
# Terminal 1 — API server
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
pnpm --filter @workspace/locumlink run dev
```

### Regenerate API client after spec changes

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `PORT` | API server port (default 8080) | No |
| `NODE_ENV` | `development` or `production` | No |

---

## Seed Data

Running `pnpm --filter @workspace/scripts run seed` creates:

- **12 medical specialties** with real Kenyan market rate ranges (KES)
- **3 clinic profiles** — Aga Khan Westlands (verified), MedPlus Upperhill (verified), Karen Medical Centre (pending)
- **3 locum profiles** — Dr. Grace Wanjiku (GP, verified), Nurse Patrick Otieno (verified), Dr. Samuel Mwangi (Anaesthesia, pending)
- **3 open shifts** — Saturday GP cover, night nursing, emergency anaesthesia
- **Demo users** for all three roles

---

## Roadmap

The platform is being built in 20 phases:

- [x] **Phase 1** — Data architecture, Drizzle schema, OpenAPI spec, codegen pipeline
- [x] **Phase 2** — Backend API (14 route modules, JWT auth, Zod validation)
- [x] **Phase 3** — Frontend (30+ pages, React + Vite, TanStack Query)
- [ ] **Phase 4** — M-Pesa Daraja API integration (STK Push, B2C payouts)
- [ ] **Phase 5** — Document upload (credential verification workflow)
- [ ] **Phase 6** — SMS notifications (Africa's Talking)
- [ ] **Phase 7** — Real-time notifications (WebSocket / SSE)
- [ ] **Phase 8** — Smart shift matching algorithm (specialty + location + availability + reliability)
- [ ] **Phase 9** — Digital contract generation (PDF with e-signatures)
- [ ] **Phase 10** — Mobile PWA (offline shift browsing, push notifications)
- [ ] **Phase 11** — KRA-ready tax reporting exports
- [ ] **Phase 12** — Advanced analytics (fill rate trends, rate benchmarking)
- [ ] **Phase 13** — Clinic team accounts (multiple HR users per clinic)
- [ ] **Phase 14** — Referral and bonus system
- [ ] **Phase 15** — Multi-county expansion (Mombasa, Kisumu)
- [ ] **Phase 16** — Admin tooling (impersonation, manual overrides)
- [ ] **Phase 17** — Rate cards and negotiation
- [ ] **Phase 18** — Background check integrations (HelioHR / Duma Works)
- [ ] **Phase 19** — Public locum profiles and clinic pages
- [ ] **Phase 20** — Production hardening, load testing, SLA monitoring

---

## Contributing

This is a private project. Pull requests are welcome from authorised contributors.

1. Branch from `main`
2. Name branches `feature/`, `fix/`, or `chore/`
3. Run `pnpm run typecheck` before pushing
4. Use conventional commits (`feat:`, `fix:`, `chore:`)

---

## License

Proprietary. All rights reserved. © 2026 LocumLink Kenya.
