# Savvy Bee — Compliance OS

Single-tenant compliance platform for **Savvy Bee Limited**, aligned to **SB-COMP-SPEC-2026-001** (iRecharge SLA automated compliance framework). Not multi-client.

**Authoritative requirements:** keep `SavvyBee_Compliance_ProductSpec.pdf` (your internal copy) as the legal/product source of truth. This repo implements automatable controls across the seven domains in that spec (KYC/CDD, AML, privacy, settlement ops, incidents, governance, etc.).

## Stack

| Part | Technology |
|------|------------|
| API | Node.js, Express 5, TypeScript, Prisma, SQLite (dev) |
| Web | React 19, Vite, Tailwind v4 |

Use **PostgreSQL** in production (`DATABASE_URL`); run `npx prisma migrate deploy` after pointing `DATABASE_URL` at Postgres.

## Run locally

**Terminal 1 — API**

```bash
cd server
cp .env.example .env   # first time only
npm install             # first time only
npx prisma migrate dev  # first time only (creates dev.db + seed)
npm run dev
```

Default login after seed: `officer@savvybee.internal` / `ChangeMe!123`

**Terminal 2 — Web**

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `http://localhost:3000`.

## Deploy frontend on Vercel

The **API is not on Vercel** in this setup (Express + SQLite/Postgres + file uploads fit better on Railway, Render, Fly.io, etc.). Vercel hosts the **static SPA** only.

1. Push this repo to GitHub (already: [digitalboomster/compliance_tool](https://github.com/digitalboomster/compliance_tool)).
2. In [Vercel](https://vercel.com) → **Add New Project** → import **`compliance_tool`**.
3. Set **Root Directory** to **`web`** (important).
4. Framework: **Vite** (auto). Build: `npm run build`, output: **`dist`**.
5. **Environment variables** (Production + Preview):
   - **`VITE_API_URL`** = your deployed API base URL, **no trailing slash**  
     Example: `https://your-api.railway.app`  
     The browser will call `https://your-api.railway.app/api/...`.
6. On the **API server**, set **`CORS_ORIGIN`** to your Vercel URL(s), e.g. `https://compliance-tool.vercel.app` (comma-separate multiple origins if needed — you may need a small server change to split; for one URL it works today).

`web/vercel.json` adds SPA rewrites so React Router routes load correctly.

## What works today

- **Auth** (JWT), **audit log** on sensitive actions.
- **Compliance cases** (queue, detail, notes, assign, approve / reject / request info, document upload + download, virus-scan hook stub).
- **Queue summary** stats from the database.
- **Business KYC** applications (draft + submit for review).
- **Incidents** (create + resolve) for SLA-style tracking.
- **Settings:** processor register, consent records, DSAR intake.

## Production hardening (next)

- Replace SQLite with PostgreSQL; secure `JWT_SECRET`; HTTPS; real AV (e.g. ClamAV) on upload; BVN/NIBSS and sanctions APIs; email notifications; S3-compatible storage for documents; NDPA retention jobs.
