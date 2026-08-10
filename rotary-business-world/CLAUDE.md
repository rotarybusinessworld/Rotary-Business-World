@AGENTS.md

# Rotary Business World

Worldwide, searchable business directory for **verified Rotarians**. Members register, get
verified by matching against the official Rotary roster, and list their businesses (with photos).
Anyone verified can search the directory to find fellow Rotarians in the same industry.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) + React 19 — deployed on **Railway**
- **Tailwind v4** (`@theme` in `src/app/globals.css`) — premium **deep navy `#0b1226` + refined gold `#c9a24c`**, serif display (**Fraunces**) for headings, Inter for body. Dark navy chrome (header/hero/footer), light editorial content.
- **Brand assets** in `public/brand/`: `rbw-logo.jpg` (full logo w/ wordmark) and `rbw-mark.jpg` (cropped RBW emblem tile, used in header/auth). Source: `../Data/Rotary-Buisness-world.jpeg`.
- **Prisma 6** + **PostgreSQL** (pinned to 6 on purpose — 7 forces driver adapters we don't need)
- **Auth.js v5** (Credentials + JWT). Gate access with `await auth()` in layouts/pages — **no middleware/proxy**
- **AWS S3** for image uploads (via `@aws-sdk/client-s3`, behind `backend/storage`)
- **Infra**: **Railway** = app + Postgres (co-located); **Hostinger** = domain/DNS + email (SMTP); **AWS S3** = uploads
- Search: Postgres `tsvector` + `pg_trgm`, behind `backend/search` (swappable for Typesense later)

## Project structure

Code under `src/` is split into clearly-named folders so the frontend/backend boundary is
obvious (one Next.js app — **not** a separate API server):

```
src/
  frontend/   # all UI components (ui/, brand/, dashboard/, search/, site-header)
  backend/    # all server-side code: db, services/, actions/ (Server Actions),
              #   search/, storage/, verification, roster, taxonomy, password, auth-helpers,
              #   errors, actor
  shared/     # used by both sides: validators (zod), utils (cn + slugify), types/
  app/        # Next.js routes/pages — Next PINS the router here, so it can't move into
              #   frontend/. Treat it as the frontend's "front door": thin pages that wire
              #   UI (@/frontend) to backend (@/backend).
```

Auth.js config lives in `backend/auth.ts` (imported as `@/backend/auth`) — so `src/` root holds
only the four folders. Path alias `@/*` → `src/*` (so `@/backend/db`, `@/frontend/...`, etc.).
The only server code outside `backend/` is what Next.js requires in `app/`: the `app/api/*`
route handlers (thin — they validate then call `@/backend/*`) and Server Component pages.

## Local dev

Postgres is a throwaway Homebrew cluster on **port 5544** (see `.env`). If it's not running:

```bash
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D /tmp/rbw-pgdata -o "-p 5544 -k /tmp" -l /tmp/rbw-pg.log start
```

```bash
npm run dev              # start dev server (http://localhost:3000)
npm run db:deploy        # apply migrations
npm run db:seed          # seed taxonomy + sample districts/clubs/roster
npm run db:import-roster -- roster.csv   # import the real global roster (re-runnable)
npm run typecheck        # tsc --noEmit
npm run build            # production build
```

Scripts run through `node --env-file=.env --import tsx` because tsx (unlike the Prisma CLI)
does not auto-load `.env`.

## Deployment (Railway + Hostinger + AWS S3)

**App host = Railway** (app **and** Postgres, co-located so DB round-trips stay sub-ms — the main
reason not to run the app on a Hostinger VPS against a remote DB). **Hostinger** = domain/DNS +
email (SMTP). **AWS S3** = uploads.

> **Object storage is required in production.** Without S3 configured, `backend/storage` falls
> back to writing files under `public/uploads/`. On Railway that **breaks**: the filesystem is
> ephemeral (uploads vanish on every redeploy) and not shared across instances. Since business
> photos are a core feature, set up S3 before going live.

**1. AWS S3 (one-time):**
- Create a bucket (default name in `.env.example`: `rotary-business-world`) in your region
  (`AWS_REGION`).
- **Grant public read via a BUCKET POLICY** (or put CloudFront in front) — not per-object ACLs.
  Modern buckets are "bucket owner enforced" (ACLs disabled), and the upload code sends no ACL.
  Turn off "Block all public access" if serving directly from the bucket.
- Use the public host (no protocol) as `NEXT_PUBLIC_S3_PUBLIC_HOSTNAME` — e.g.
  `rotary-business-world.s3.<region>.amazonaws.com` or a CloudFront/custom domain.
- Create an **IAM user** with `s3:PutObject` on the bucket → `AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`. (Secrets stay server-only — never `NEXT_PUBLIC_`.)

**2. Railway (app + Postgres):**
- Add the **Postgres** plugin → copy its connection string into `DATABASE_URL`.
- Set env vars (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET` (`npx auth secret`), `AUTH_URL`
  (the deployed URL), the S3 vars (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `S3_BUCKET`, `NEXT_PUBLIC_S3_PUBLIC_HOSTNAME`), and `EMAIL_FROM` / `SMTP_URL`.
- Build/start use the standard `next build` / `next start` (`npm run build` / `npm start`).

**3. Hostinger:** point the domain's DNS at the Railway app (set `AUTH_URL` to that domain).
Email/SMTP creds go in `SMTP_URL` — but note **email sending is not yet implemented** (see below).

**4. First deploy — initialize the DB** (same scripts as local, against prod `DATABASE_URL`):
`npm run db:setup` (migrate deploy + search SQL + seed), then `npm run make-admin -- <email>`
to bootstrap the first admin. Import the real roster with `npm run db:import-roster -- roster.csv`.

The app is stateless (JWT sessions), so it scales horizontally. Once you run **more than one
instance**, add Postgres connection pooling (Railway pooler / PgBouncer / Prisma
`connection_limit`) — a single instance is fine without it.

> **Email is not implemented yet.** `EMAIL_FROM`/`SMTP_URL` are placeholders; there is no
> `nodemailer` / email service, and registration sends nothing (it verifies against the roster
> directly). Wiring Hostinger SMTP is net-new work — decide *what* to send first (email-verify
> link flow vs admin notifications) before building it.

## Architecture notes

- **Search vector** (`Business.searchVector`) is a plain `tsvector` kept in sync by the
  `business_search_vector_trigger` (see the init migration), NOT a generated column — a
  generated column makes Prisma emit a spurious `ALTER COLUMN ... DROP DEFAULT` every migrate.
  It's declared `Unsupported("tsvector")?` so Prisma leaves it alone. Denormalized
  `industryName`/`categoryName` on `Business` feed the vector (set on every business write).
- **Verification** (`backend/verification.ts`): exact Rotary-ID match → VERIFIED; strong fuzzy
  name match in the same district → VERIFIED; otherwise PENDING + a `VerificationRequest`
  (admin queue). PENDING users can log in and browse, but listing tools are gated.
- **Search layer**: `getSearchService()` in `backend/search` returns the `SearchService`
  interface; only `postgres.ts` implements it today. Swap here, not in callers.

## Status

Done + verified end-to-end: scaffold, premium navy/gold theme, auth (register/login), roster
import + verification (with impersonation guard), directory search (FTS + trigram + facets +
autocomplete), business CRUD + photo uploads, business detail + member profile + "similar
businesses" rail, and the **admin verification queue** (approve/reject at `/admin/verifications`,
role-gated). Bootstrap the first admin with `npm run make-admin -- <email>`.

Storage: `backend/storage` picks **AWS S3** when its env vars are set, else writes to
`public/uploads/` (dev only — gitignored). Uploads go through `POST /api/upload` (verified users,
5 MB, image types).

Next: connect/follow between members (Phase 5); listing moderation + taxonomy admin (Phase 6
extras); transactional email via Hostinger SMTP (not yet built); SEO metadata/sitemap; deploy to
Railway (Phase 7 — needs DATABASE_URL, AUTH_SECRET, AWS S3 creds).
