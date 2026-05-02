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
