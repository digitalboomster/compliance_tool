# Savvy Bee — Compliance OS

Single-tenant compliance platform for **Savvy Bee Limited**, aligned to **SB-COMP-SPEC-2026-001** (iRecharge SLA automated compliance framework). Not multi-client.

**Authoritative requirements:** keep `SavvyBee_Compliance_ProductSpec.pdf` (your internal copy) as the legal/product source of truth. This repo implements automatable controls across the seven domains in that spec (KYC/CDD, AML, privacy, settlement ops, incidents, governance, etc.).

## Stack

| Part | Technology |
|------|------------|
| API | Node.js, Express 5, TypeScript, Prisma, **PostgreSQL** |
| Web | React 19, Vite, Tailwind v4 |
| Deploy | **One Vercel project** — static SPA from `web/dist` + serverless API at `/api` |

Document uploads on Vercel use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) when `BLOB_READ_WRITE_TOKEN` is set; locally they use `UPLOAD_DIR` on disk.

## Run locally

### Mock MVP (default — no Postgres, no API server)

The web app ships with an **in-browser mock API** (sample cases, incidents, KYC, settings). By default **nothing talks to a database**.

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. You should see **“Mock MVP · no database”** in the header.

To use the **real** Express API instead, create `web/.env` with `VITE_USE_REAL_API=true` and run the server (below); Vite will proxy `/api` to port 3000.

### Full stack (Postgres + API)

**1. Postgres** — from repo root: `docker compose up -d`

**2. API**

```bash
cd server
cp .env.example .env   # first time only; edit DATABASE_URL if needed
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

There is **no sign-in screen**: the API uses the **first user** in the database (by creation time) as the actor for all requests.

**3. Web** — `cd web`, add `VITE_USE_REAL_API=true` in `.env`, `npm run dev`. The Vite dev server proxies `/api` to `http://localhost:3000`.

## Deploy on Vercel (web + API together)

Deploy from the **repository root** (not `web/`). Root `vercel.json` builds the server, builds the SPA, runs **`npm run verify:vercel`** (checks `server/dist/app.js`, `web/dist/index.html`, and `api/index.ts`), and routes `/api/*` to a single serverless function.

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com) → **Add New Project** → import the repo.
3. Leave **Root Directory** at the **repository root** (`.`). If it is set to **`web`**, Vercel will **not** deploy the `api/` serverless function and every `/api/...` call will **404** — clear the override in **Settings → General → Root Directory**.
4. **Environment variables** (Production — add Preview if you use preview DBs):

   | Variable | Purpose |
   |----------|---------|
   | `DATABASE_URL` | PostgreSQL connection string (e.g. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), Neon, Supabase). |
   | `JWT_SECRET` | Any non-empty string (optional Bearer JWT verification only; app does not use login). |
   | `BLOB_READ_WRITE_TOKEN` | From Vercel Blob — **required** for case document upload/download on Vercel. |

   Do **not** set `VITE_API_URL` for the default same-origin setup; the browser calls `/api/...` on your Vercel domain.

5. **Before the app can use the API**, apply the schema and **seed** (creates users and sample data) against the **same** `DATABASE_URL` as Vercel:

   ```bash
   cd server
   npm install
   export DATABASE_URL="postgresql://..."   # your production Postgres URL
   npm run db:deploy-and-seed
   ```

   Without at least one user, protected routes return **503**. The seed **upserts** `officer@savvybee.internal` and `admin@savvybee.internal` (that officer is the default actor because it is created first).

**CORS:** With the SPA and API on the same origin, you normally do not need `CORS_ORIGIN`. If you ever split hosts, set `CORS_ORIGIN` to a comma-separated list of allowed web origins.

**404 after deploy:** Confirm **Root Directory** is the repo root (see above). Smoke-test the API with `curl https://<your-project>.vercel.app/api/health` — expect JSON `{"ok":true,...}`. If that 404s, the function bundle did not deploy (wrong root or failed build).

**Function size (250 MB limit):** Do not set `includeFiles` to all of `server/**` — that copies every file under `server/node_modules` and blows past Vercel’s limit. This repo relies on Vercel’s file tracing from `api/index.ts` into `server/dist` and resolved dependencies. If Prisma fails at runtime with a missing engine error, add a **narrow** `includeFiles` glob for `server/node_modules/.prisma/**` only (in `vercel.json`), not the whole server tree.

## What works today

- **No login UI** — API acts as the first seeded user; **audit log** on sensitive actions.
- **Compliance cases** (queue, detail, notes, assign, approve / reject / request info, document upload + download, virus-scan hook stub).
- **Queue summary** stats from the database.
- **Business KYC** applications (draft + submit for review).
- **Incidents** (create + resolve) for SLA-style tracking.
- **Settings:** processor register, consent records, DSAR intake.

## Production hardening (next)

- Re-enable proper authentication before any sensitive production use; real AV (e.g. ClamAV) on upload; BVN/NIBSS and sanctions APIs; email notifications; NDPA retention jobs.
