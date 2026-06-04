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

## Completed Phases (1–47)

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
| 29 | Forgot/reset password flow: `POST /auth/forgot-password` (JWT reset token, 1h expiry, separate HMAC secret) + `POST /auth/reset-password` (validates token, updates hash); frontend `/forgot-password` + `/reset-password`; Critical auth fix: `setAuthTokenGetter` wired in main.tsx; Onboarding-aware login redirect |
| 30 | Account Settings page: account info card, change-password form; `POST /auth/change-password` backend route |
| 31 | Locum profile photo upload: `GET /api/locums/:id/photo` public endpoint, GCS upload via `useUpload` + PATCH to save path |
| 32 | Shift invitation from locum profile; clinic dashboard Pending Reviews stat card |
| 33–39 | (Various bug fixes, TS improvements, sort/filter enhancements) |
| 40 | Fixed 3 TypeScript errors in clinic shift detail page |
| 41 | Shift invitations section on locum dashboard (live invite cards from clinics) |
| 42 | Notification preferences card in Account Settings (7 event toggles, 3 channel toggles) |
| 43 | Clinic locums directory: experience filter, sort options, urgent-available toggle; backend `isAvailableForUrgent` DB filter |
| 44 | Admin users page: status filter pills with counts, summary stat cards, pending-review quick-link, per-row Review button |
| 45 | Admin Audit Log: `GET /admin/audit-logs` backend endpoint; audit writes on verify locum/clinic, resolve dispute, release payment; `/admin/audit` page with entity-type filter + pagination |
| 46 | Clinic Quick Post Urgent Shift: amber "Post Urgent Shift" button in dashboard header + quick actions; opens a dialog with minimal fields (title, specialty, date, time, rate), posts as `urgency: urgent` |
| 47 | Comprehensive documentation: local dev setup, environment variables reference, local deployment instructions, cloud/production deployment guide |

## Architecture Notes

- **Object Storage**: presigned URL flow — client POSTs metadata to `/api/storage/uploads/request-url`, then PUTs file directly to GCS. Object paths stored in locum record fields (`idDocumentUrl`, `practicingCertUrl`, `registrationCertUrl`).
- **Notification status enum**: `pending | sent | delivered | failed | read` (no "unread" value — filter as `status !== "read"`)
- **Booking status enum**: `confirmed | checked_in | completed | disputed | cancelled | no_show`
- **Notification badge**: polls `/api/notifications` every 30s in layout sidebar for locum users
- **Seed idempotency**: uses `onConflictDoNothing()` throughout; shift guard uses `>= 10` existing check rather than early return so notifications always re-seed
- **Audit log**: written asynchronously (non-blocking) by `writeAudit()` helper in `admin.ts` after verify, dispute-resolve, and payment-release actions

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

---

## Deployment Guide

### Local Development

#### Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Node.js | 24.x | https://nodejs.org or `nvm install 24` |
| pnpm | 9.x | `npm i -g pnpm` |
| PostgreSQL | 15 or 16 | https://www.postgresql.org/download/ |
| Git | any | https://git-scm.com |

#### Step-by-step setup

```bash
# 1. Clone
git clone https://github.com/JBlizzard-sketch/locumlink-kenya.git
cd locumlink-kenya

# 2. Install dependencies (all workspaces)
pnpm install

# 3. Copy and fill in environment variables (see reference below)
cp .env.example .env   # if provided; otherwise create .env manually

# 4. Push the database schema
pnpm --filter @workspace/db run push

# 5. Seed demo data (idempotent — safe to run multiple times)
pnpm --filter @workspace/scripts run seed

# 6. Start the API server (terminal 1)
PORT=8080 pnpm --filter @workspace/api-server run dev

# 7. Start the frontend (terminal 2)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/locumlink run dev
```

Open `http://localhost:5173` in your browser.
The API is at `http://localhost:8080`.

> **Note for local dev:** Vite's dev server proxies `/api` requests to `localhost:8080`. Both services must be running at the same time.

#### Environment Variables Reference

Create a `.env` file in the **project root** (all packages inherit from it via Drizzle / process.env):

```env
# ── Database ───────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/locumlink

# ── Auth ───────────────────────────────────────────────
SESSION_SECRET=your-32-char-random-secret-here

# ── Object / File Storage (Google Cloud Storage) ───────
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-gcs-bucket-name
PRIVATE_OBJECT_DIR=private
PUBLIC_OBJECT_SEARCH_PATHS=public

# ── M-Pesa (Safaricom Daraja) ──────────────────────────
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_ENVIRONMENT=sandbox    # or "production"

# ── Africa's Talking SMS ───────────────────────────────
AT_USERNAME=your-at-username
AT_API_KEY=your-at-api-key

# ── Optional ───────────────────────────────────────────
NODE_ENV=development
PORT=8080
```

> **On Replit** these are stored as Secrets (never in files). Never commit a `.env` file with real values to version control.

---

### Deploying on Replit (Recommended)

Replit handles hosting, TLS, scaling, and environment variable injection automatically.

#### One-click deploy

1. Open the project on Replit (https://replit.com)
2. Make sure all **Secrets** are set under the Secrets tab:
   - `DATABASE_URL`, `SESSION_SECRET`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`
   - Any M-Pesa / Africa's Talking keys for production features
3. Click **Deploy** in the top bar and choose **Reserved VM** or **Autoscale**
4. Replit builds and starts both services automatically using the configured workflows
5. The app is available at `https://<your-slug>.replit.app`

#### After deploying

- Run DB migrations against the production database:
  ```bash
  # In the Replit Shell tab (targets the live DATABASE_URL)
  pnpm --filter @workspace/db run push
  ```
- Optionally seed initial data:
  ```bash
  pnpm --filter @workspace/scripts run seed
  ```

---

### Deploying to a VPS / Dedicated Server (Ubuntu 22.04+)

Use this path if you need full control over infrastructure (AWS EC2, DigitalOcean Droplet, Hetzner, etc.).

#### 1. Provision the server

- Recommended: 2 vCPU / 2 GB RAM minimum
- Open ports: 80 (HTTP), 443 (HTTPS), 22 (SSH)
- Install Node 24, pnpm, PostgreSQL, and Nginx:

```bash
# Node 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
npm i -g pnpm

# PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser --pwprompt locumlink
sudo -u postgres createdb -O locumlink locumlink_prod

# Nginx
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 2. Clone and build

```bash
git clone https://github.com/JBlizzard-sketch/locumlink-kenya.git /opt/locumlink
cd /opt/locumlink
pnpm install
pnpm run build
```

#### 3. Set environment variables

Create `/opt/locumlink/.env` with all variables from the reference above, using your production values.

#### 4. Run DB migrations

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
```

#### 5. Create systemd services

**API server** — `/etc/systemd/system/locumlink-api.service`:

```ini
[Unit]
Description=LocumLink API Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/locumlink/artifacts/api-server
EnvironmentFile=/opt/locumlink/.env
Environment=PORT=8080
Environment=NODE_ENV=production
ExecStart=/usr/bin/node --enable-source-maps /opt/locumlink/artifacts/api-server/dist/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Frontend** — serve the Vite build as static files via Nginx (no Node process needed).

Build the frontend:

```bash
cd /opt/locumlink
BASE_URL=/ pnpm --filter @workspace/locumlink run build
# Output lands in artifacts/locumlink/dist/
```

#### 6. Configure Nginx

`/etc/nginx/sites-available/locumlink`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend (static)
    root /opt/locumlink/artifacts/locumlink/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy — forward /api/* to Express
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        # SSE support
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/locumlink /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 7. TLS with Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot auto-renews; add a cron or use the provided systemd timer.

#### 8. Start services

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now locumlink-api
sudo systemctl status locumlink-api
```

The app is now live at `https://your-domain.com`.

---

### Deploying to Railway ⭐ (Recommended cloud platform)

Railway is the best cloud fit for this stack: it runs full Node.js processes (not serverless), has a first-class managed PostgreSQL service, and SSE (Server-Sent Events) works out of the box. Monorepo support is built-in.

#### 1. Prerequisites

- [Railway account](https://railway.app) (free tier available)
- Railway CLI: `npm i -g @railway/cli && railway login`

#### 2. Create a project

```bash
# From the repo root
railway init          # creates a new Railway project linked to this directory
```

Or create via the Railway dashboard → New Project → Deploy from GitHub repo.

#### 3. Add a PostgreSQL service

In the Railway dashboard: **New Service → Database → PostgreSQL**.  
Railway injects `DATABASE_URL` automatically into all services in the same project.

#### 4. Configure services

LocumLink needs **two services** in Railway — one for the API, one to serve the built frontend.

**Service 1 — API server**

In the Railway dashboard, add a service pointing to this repo. Then:

- **Root directory**: `artifacts/api-server`
- **Build command**: `cd /app && pnpm install && pnpm run build`
- **Start command**: `node --enable-source-maps dist/index.mjs`
- **Port**: Railway auto-detects from `$PORT`

**Service 2 — Frontend (static)**

Railway can serve a static Vite build via [Static Site](https://docs.railway.app/deploy/static-sites):

- **Root directory**: `artifacts/locumlink`
- **Build command**: `cd /app && pnpm install && BASE_URL=/ pnpm run build`
- **Output directory**: `dist`

#### 5. Set environment variables

In each service's **Variables** tab, add:

```
SESSION_SECRET=...
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...
PRIVATE_OBJECT_DIR=private
PUBLIC_OBJECT_SEARCH_PATHS=public
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_PASSKEY=...
MPESA_ENVIRONMENT=production
AT_USERNAME=...
AT_API_KEY=...
NODE_ENV=production
```

`DATABASE_URL` is injected automatically from the PostgreSQL service.

#### 6. Run DB migrations

```bash
# In the Railway shell (Dashboard → Service → Shell tab)
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed   # optional
```

#### 7. Deploy

Railway auto-deploys on every push to your linked GitHub branch. To trigger manually:

```bash
railway up
```

The API will be available at `https://<service>.up.railway.app`.

---

### Deploying to Render

Render is a solid alternative to Railway with a generous free tier and similar long-running process support (SSE works).

#### 1. Prerequisites

- [Render account](https://render.com)
- Connect your GitHub repo under **Dashboard → New → Connect a repository**

#### 2. Create a PostgreSQL database

Dashboard → **New → PostgreSQL** → note the **Internal Database URL** (used as `DATABASE_URL`).

#### 3. Create a Web Service — API server

- **Name**: `locumlink-api`
- **Root directory**: `artifacts/api-server`
- **Runtime**: Node
- **Build command**: `cd /workspace && pnpm install && pnpm run build`
- **Start command**: `node --enable-source-maps dist/index.mjs`
- **Instance type**: Starter ($7/mo) or Free (sleeps after 15 min of inactivity)

#### 4. Create a Static Site — Frontend

- **Name**: `locumlink-web`
- **Root directory**: `artifacts/locumlink`
- **Build command**: `cd /workspace && pnpm install && BASE_URL=/ pnpm run build`
- **Publish directory**: `dist`
- **Rewrite rule**: `/*` → `/index.html` (for SPA routing)

#### 5. Environment variables

In the API Web Service → **Environment**, add the same variables listed in the Railway section above. Set `DATABASE_URL` to the **Internal Database URL** from step 2.

#### 6. Run DB migrations

Use the Render dashboard **Shell** tab on the API service:

```bash
pnpm --filter @workspace/db run push
```

#### 7. Custom domain & TLS

Dashboard → your service → **Settings → Custom Domains** → add your domain. Render provisions Let's Encrypt TLS automatically.

---

### Deploying to Vercel — Frontend only ⚠️

> **Important**: Vercel's serverless (Edge / Lambda) model does **not** support long-lived HTTP connections. LocumLink's real-time notification system uses **Server-Sent Events (SSE)**, which require a persistent connection. The Express API **cannot run on Vercel**.
>
> Use Vercel for the **frontend only**, and host the API on Railway, Render, or a VPS.

#### Frontend on Vercel + API elsewhere

1. **Deploy the API** to Railway or Render (see above). Note its public URL (e.g. `https://locumlink-api.up.railway.app`).

2. **Deploy the frontend** to Vercel:

   ```bash
   npm i -g vercel
   vercel --cwd artifacts/locumlink
   ```

   Or connect the GitHub repo via the Vercel dashboard.

3. **Configure Vite** to proxy API calls to your hosted API in production by setting a Vercel environment variable:

   ```
   VITE_API_BASE_URL=https://locumlink-api.up.railway.app
   ```

   Then update `artifacts/locumlink/vite.config.ts` to use the env var for the dev proxy, and prefix all API fetch calls with `import.meta.env.VITE_API_BASE_URL` (or leave them relative if a Vite proxy handles it in dev).

4. Add a `vercel.json` in `artifacts/locumlink/` for SPA routing:

   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

5. Set `VITE_API_BASE_URL` in the Vercel dashboard → Project → Settings → Environment Variables.

---

### Updating Production

```bash
cd /opt/locumlink
git pull origin main
pnpm install
pnpm run build
pnpm --filter @workspace/db run push   # if schema changed
sudo systemctl restart locumlink-api
# Frontend: rebuild + Nginx picks up new dist/ automatically (no restart needed)
BASE_URL=/ pnpm --filter @workspace/locumlink run build
```

---

### Health Check

The API exposes a health endpoint:

```
GET /api/health
→ { "status": "ok", "db": "connected", "uptime": 123.4 }
```

Use this with your monitoring tool (UptimeRobot, Grafana, etc.) to alert on outages.

## User Preferences

- Push all changes to GitHub after every phase using: `git push "https://JBlizzard-sketch:$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/JBlizzard-sketch/locumlink-kenya.git" main`
