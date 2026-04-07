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

**1. Postgres**

From the repo root:

```bash
docker compose up -d
```

**2. API**

```bash
cd server
cp .env.example .env   # first time only; edit DATABASE_URL if needed
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Default login after seed: `officer@savvybee.internal` / `ChangeMe!123`

**3. Web**

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `http://localhost:3000`.

## Deploy on Vercel (web + API together)

Deploy from the **repository root** (not `web/`). Root `vercel.json` builds the server, builds the SPA, runs **`npm run verify:vercel`** (checks `server/dist/app.js`, `web/dist/index.html`, and `api/index.ts`), and routes `/api/*` to a single serverless function.

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com) → **Add New Project** → import the repo.
3. Leave **Root Directory** at the **repository root** (`.`). If it is set to **`web`**, Vercel will **not** deploy the `api/` serverless function and every `/api/...` call will **404** — clear the override in **Settings → General → Root Directory**.
4. **Environment variables** (Production — add Preview if you use preview DBs):

   | Variable | Purpose |
   |----------|---------|
   | `DATABASE_URL` | PostgreSQL connection string (e.g. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), Neon, Supabase). |
   | `JWT_SECRET` | Long random string for signing JWTs. |
   | `BLOB_READ_WRITE_TOKEN` | From Vercel Blob — **required** for case document upload/download on Vercel. |

   Do **not** set `VITE_API_URL` for the default same-origin setup; the browser calls `/api/...` on your Vercel domain.

5. After the first successful deploy, run migrations against the production database (one-off from your machine or CI), with `DATABASE_URL` pointing at production:

   ```bash
   cd server && npx prisma migrate deploy
   ```

   Then seed or create the first admin user as you prefer.

**CORS:** With the SPA and API on the same origin, you normally do not need `CORS_ORIGIN`. If you ever split hosts, set `CORS_ORIGIN` to a comma-separated list of allowed web origins.

**404 after deploy:** Confirm **Root Directory** is the repo root (see above). Smoke-test the API with `curl https://<your-project>.vercel.app/api/health` — expect JSON `{"ok":true,...}`. If that 404s, the function bundle did not deploy (wrong root or failed build).

## What works today

- **Auth** (JWT), **audit log** on sensitive actions.
- **Compliance cases** (queue, detail, notes, assign, approve / reject / request info, document upload + download, virus-scan hook stub).
- **Queue summary** stats from the database.
- **Business KYC** applications (draft + submit for review).
- **Incidents** (create + resolve) for SLA-style tracking.
- **Settings:** processor register, consent records, DSAR intake.

## Production hardening (next)

- Secure `JWT_SECRET`; real AV (e.g. ClamAV) on upload; BVN/NIBSS and sanctions APIs; email notifications; NDPA retention jobs.
