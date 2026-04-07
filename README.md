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

## What works today

- **Auth** (JWT), **audit log** on sensitive actions.
- **Compliance cases** (queue, detail, notes, assign, approve / reject / request info, document upload + download, virus-scan hook stub).
- **Queue summary** stats from the database.
- **Business KYC** applications (draft + submit for review).
- **Incidents** (create + resolve) for SLA-style tracking.
- **Settings:** processor register, consent records, DSAR intake.

## Production hardening (next)

- Replace SQLite with PostgreSQL; secure `JWT_SECRET`; HTTPS; real AV (e.g. ClamAV) on upload; BVN/NIBSS and sanctions APIs; email notifications; S3-compatible storage for documents; NDPA retention jobs.
