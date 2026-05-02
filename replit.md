# LocumLink Kenya

## Overview

Production-grade two-sided marketplace connecting verified locum medical professionals with private clinics in Nairobi. pnpm monorepo, TypeScript throughout.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (wildcard routes use `*name` syntax)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Frontend**: React 18 + Vite, Wouter, TanStack Query, Radix UI / shadcn, Tailwind v4
- **File storage**: Google Cloud Storage via Replit Object Storage sidecar (presigned URL flow)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data (idempotent)

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Locum | dr.wanjiku@gmail.com | Locum@2024! |
| Clinic | hr@agakhanklinic.co.ke | Clinic@2024! |
| Admin | admin@locumlink.co.ke | Admin@2024! |

## Completed Phases (1–13)

| Phase | Description |
|-------|-------------|
| 1–3 | DB schema (11 tables), OpenAPI spec, Drizzle migrations |
| 4–6 | Auth (JWT), 14 API routes, session management |
| 7–9 | 30+ frontend pages across Locum/Clinic/Admin dashboards |
| 10 | M-Pesa Daraja integration (STK push, C2B), Africa's Talking SMS |
| 11 | SSE real-time notifications with exponential backoff reconnect |
| 12 | Smart shift matching UI (5 filters, match score algorithm, recommendation tab) |
| 13 | GCS-backed document uploads (presigned URL flow), unread notification badge in nav, mark-all-read, admin doc viewer with clickable links |
| 14 | Full analytics & reporting: real earningsByMonth (6 months), recentActivity feed, clinic payments scoped to clinic, topLocums table, admin revenue trend + shift volume charts, revenueByMonth in PlatformSummary (8 months of data), extended seed to 14 shifts / 8 payments |
| 15 | Calendar & Availability overhaul: `/locums/me/availability` GET+POST routes, working "Set Weekends", "Set Weekdays", "Clear All" bulk actions, confirmed-shift calendar overlay (blue), completed-shift overlay (green), day detail panel showing booking info or availability toggle, upcoming shifts list, month stats (available days, booked shifts, upcoming count), codegen script permanently fixed to strip invalid barrel export |
| 16 | Clinic Application Pipeline: `GET /clinics/me/applications` cross-shift endpoint with status filter, dedicated `/clinic/applications` page, status tabs (All/Applied/Shortlisted/Confirmed/Rejected) with counts, real-time search by locum name or shift, action buttons (Shortlist/Confirm/Reject) with optimistic invalidation, summary stat cards, "Applications" added to clinic sidebar nav |
| 17–26 | Ratings, Earnings, Calendar, Locum Matched Shifts, Clinic Matched Locums, Locum Documents (GCS upload), Locum Contract signing, Clinic Templates, Clinic Analytics (recharts), Admin Users/Disputes/Payments pages; SSE `shift_invitation` + `payment_released` event types; Admin payment release with M-Pesa ref dialog |
| 27 | Mobile nav drawer (Sheet), CSV export for clinic analytics, KRA income report CSV for locum earnings |
| 28 | Post-registration onboarding wizard: `POST /onboarding/locum` + `POST /onboarding/clinic` backend routes (idempotent); 2-step wizard frontend at `/onboarding` for locum (registration body/number, specialty, sub-county, M-Pesa) and clinic (name, type, address, contact info); auth-provider redirects to `/onboarding` after registration instead of dashboard; unauthenticated guard redirects to `/login`; OpenAPI spec + codegen |

## Architecture Notes

- **Object Storage**: presigned URL flow — client POSTs metadata to `/api/storage/uploads/request-url`, then PUTs file directly to GCS. Object paths stored in locum record fields (`idDocumentUrl`, `practicingCertUrl`, `registrationCertUrl`).
- **Notification status enum**: `pending | sent | delivered | failed | read` (no "unread" value — filter as `status !== "read"`)
- **Booking status enum**: `confirmed | checked_in | completed | disputed | cancelled | no_show`
- **Notification badge**: polls `/api/notifications` every 30s in layout sidebar for locum users
- **Seed idempotency**: uses `onConflictDoNothing()` throughout; shift guard uses `>= 10` existing check rather than early return so notifications always re-seed

## Package Layout

```
artifacts/
  api-server/         Express 5 API (port from $PORT)
  locumlink/          React + Vite frontend
lib/
  db/                 Drizzle schema + migrations
  api-spec/           OpenAPI YAML + Orval codegen config
  api-zod/            Generated Zod schemas
  api-client-react/   Generated React Query hooks
  object-storage-web/ useUpload hook + ObjectUploader component (Uppy v5)
scripts/
  src/seed.ts         Idempotent demo seed
```
