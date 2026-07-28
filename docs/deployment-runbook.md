# Innovation ERP V0.1 — Deployment Runbook

Target architecture:

| Layer | Platform |
|-------|----------|
| Web (Next.js) | Vercel |
| API (Express + Prisma) | Render |
| PostgreSQL | Neon |

Do **not** run `prisma migrate reset`, full `db:seed`, or any destructive DB command against production.

---

## 1. Neon database

Create/configure production Neon database and set `DATABASE_URL` (SSL required).

## 2. Render API

| Setting | Value |
|---------|--------|
| Root Directory | repository root (`innovation-ERP`) |
| Build Command | `npm install && npm run build --workspace=@ierp/shared && npm run db:generate --workspace=@ierp/api && npm run build --workspace=@ierp/api` |
| Start Command | `npm run start --workspace=@ierp/api` |
| Health Check Path | `/health` |

Required env: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`  
`PORT` is provided by Render.

## 3. Deploy API

Deploy Render service and wait until healthy.

## 4. Migrations (once per release needing schema)

```bash
cd apps/api
npx prisma migrate deploy
```

Or: `npm run db:migrate` from monorepo root.

## 5. API health

- `GET /health` — liveness (no DB)
- `GET /api/health` — readiness (DB connected)

## 6–7. Vercel web

Root: `apps/web` (or monorepo workspace build).  
Required: `NEXT_PUBLIC_API_URL` (includes `/api`).

## 8. CORS

Set Render `CORS_ORIGIN` to the exact Vercel origin, then redeploy API.  
Redeploy order after domain changes: **API → Web**.

## 9. Smoke test

1. Login as CEO — **My Workspace must be hidden**.
2. Login as regular employee — **My Workspace visible**.
3. Knowledge Articles populated (after backfill if needed).
4. Settings → Users / Audit Logs paginate and filter.
5. Favicon visible in browser tab.
6. `/portal` and `/vendor-portal` → 404.

## 10. Rollback

Redeploy previous Vercel/Render deployments. Never `migrate reset` production. Prefer forward-fix migrations.

---

## Knowledge backfill (one-time if articles are empty)

Migrations do **not** insert knowledge articles. If production shows 0 articles:

```bash
cd apps/api
# DATABASE_URL = Neon production
ALLOW_PRODUCTION_SEED=true ORGANIZATION_SLUG=al-noor-trading npx tsx scripts/backfill-knowledge.ts
ALLOW_PRODUCTION_SEED=true ORGANIZATION_SLUG=al-noor-trading npx tsx scripts/verify-seed-coverage.ts
```

Idempotent and safe to rerun. Do **not** run full `db:seed` on production. Do **not** add seed to Render start.
