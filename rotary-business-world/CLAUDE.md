@AGENTS.md

# Rotary Business World

A private, verified business directory for Rotarians — **trust is local, value is global.**
Each district admin vouches only for members they can plausibly know; once verified, a member
can search the entire worldwide directory.

---

## Product concept

### Core loop

```
Rotarian registers → pays membership fee → enters district review queue
  → district admin verifies against roster / local knowledge → approved
  → member can list a business → district admin reviews & approves the listing
  → listing goes live in the global directory
  → any verified member worldwide can search & leave reviews
```

### Three roles

| Role | Scope | Responsibilities |
|------|-------|-----------------|
| **Member** | Own account + own listings | Register, pay, list businesses, search, write reviews |
| **District admin** | Their district only | Approve/reject member signups & business listings for their district; one or a few per district |
| **Management account** | All districts | Cross-district stats + queues + revenue, create districts, assign district admins, override any district-level decision |

### The seven pillars

1. **Pay first.** A Rotarian registers, picks their home district, and pays the membership fee
   upfront. Payment puts them in that district's review queue — it does not grant access.
2. **District admin verifies identity.** The district admin checks the signup against the roster
   (or personal knowledge) and approves or rejects. Approved members get full platform access.
3. **Listing approval gate.** A verified member posts a business (name, category, description,
   photos, location). It stays **PENDING** (invisible in search) until the district admin reviews
   and approves it, keeping the directory clean.
4. **Global search, local trust.** Approved listings are discoverable by any verified member
   platform-wide. Search supports: keyword, location (nearest-to-me or a city/state/country),
   industry + category filters, and sorting by distance, rating, or recency.
5. **Reviews.** Verified members rate and review businesses they've dealt with. Only verified
   members can post reviews; star ratings + review counts are the trust signal on top of verified
   identity.
6. **Management oversight.** The management account sees every district at a glance — member
   counts, pending queues, revenue, review activity — and can create districts, assign/reassign
   district admins, and override any district decision.
7. **Structural growth.** New districts go live by creating the district record and assigning it
   an admin. No code change required; the searchable pool grows automatically.

---

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) + React 19 — deployed on **Railway**
- **Tailwind v4** (`@theme` in `src/app/globals.css`) — premium **deep navy `#0b1226` + refined gold `#c9a24c`**, serif display (**Fraunces**) for headings, Inter for body. Dark navy chrome (header/hero/footer), light editorial content.
- **Brand assets** in `public/brand/`: `rbw-logo.jpg` (full logo w/ wordmark) and `rbw-mark.jpg` (cropped RBW emblem tile, used in header/auth). Source: `../Data/Rotary-Buisness-world.jpeg`.
- **Prisma 6** + **PostgreSQL** (pinned to 6 on purpose — 7 forces driver adapters we don't need)
- **Auth.js v5** (Credentials + JWT). Gate access with `await auth()` in layouts/pages — **no middleware/proxy**
- **AWS S3** for image uploads (via `@aws-sdk/client-s3`, behind `backend/storage`)
- **Infra**: **Railway** = app + Postgres (co-located); **Hostinger** = domain/DNS + email (SMTP); **AWS S3** = uploads
- Search: Postgres `tsvector` + `pg_trgm`, behind `backend/search` (swappable for Typesense later)

---

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

---

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

---

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

---

## Architecture notes

- **Search vector** (`Business.searchVector`) is a `GENERATED ALWAYS … STORED` tsvector managed
  by `prisma/sql/search.sql` (applied via `npm run db:search`). Declared `Unsupported("tsvector")?`
  so Prisma treats it as opaque and never touches it. The old `business_search_vector_trigger` that
  wrote to this column has been removed — it conflicted with the generated column and caused every
  business INSERT/UPDATE to throw. **`Business.searchText`** is a second generated text column
  (also managed by `search.sql`) that concatenates all searchable fields and backs a GIN trigram
  index for multi-field fuzzy / word-similarity matching.
- **Verification** (`backend/verification.ts`): exact Rotary-ID match → VERIFIED; strong fuzzy
  name match in the same district → VERIFIED; otherwise PENDING + a `VerificationRequest`
  (admin queue). PENDING users can log in and browse, but listing tools are gated.
- **Search layer**: `getSearchService()` in `backend/search` returns the `SearchService`
  interface; only `postgres.ts` implements it today. Swap here, not in callers.
- **Roles** (`enum Role` in schema): `MEMBER` / `CLUB_ADMIN` / `SUPER_ADMIN`. Intent: `CLUB_ADMIN`
  = district admin (district-scoped); `SUPER_ADMIN` = management account (all districts). **Not
  yet differentiated in code** — see concept gaps below.
- **Mobile-first intent**: all new feature screens must be designed phone-first (base Tailwind
  classes = 375px phone; `sm:`/`md:`/`lg:` enhance upward). Desktop is derived, not the default.

---

## Status

### What's built (the spine)

Fully working end-to-end: scaffold, premium navy/gold theme, auth (register/login), roster import
+ verification (auto-match + admin queue, with impersonation guard), directory search (FTS +
trigram + industry/country facets + autocomplete), business CRUD + photo uploads, business detail
+ member profile + "similar businesses" rail, and the **admin verification queue**
(approve/reject at `/admin/verifications`, role-gated). Bootstrap the first admin with
`npm run make-admin -- <email>`.

Storage: `backend/storage` picks **AWS S3** when its env vars are set, else writes to
`public/uploads/` (dev only — gitignored). Uploads go through `POST /api/upload` (verified
users, 5 MB, image types).

### Concept gaps — not yet built

These seven pillars from the product concept are **absent or misaligned** in the current code.
Build them in this sequence (each layer supports the next):

1. **Roles + district scoping** *(rewire, not greenfield)*
   — `CLUB_ADMIN` and `SUPER_ADMIN` roles exist in the schema but behave identically today:
   `requireAdmin()` in `backend/auth-helpers.ts` gates both the same way, and the verification
   queue (`admin/verifications/page.tsx`) shows ALL districts' requests globally with no filter.
   The `District` model, `Club` model, and `RotaryInfo.districtId` FK already exist — what's
   missing is scoped queries (where `user.rotaryInfo.districtId = admin.districtId`) and
   surfacing the `SUPER_ADMIN` vs `CLUB_ADMIN` distinction in every admin route.

2. **Home-district selection at signup** *(rewire)*
   — The register form has a free-text "District" input used only for roster matching. It must
   become a real home-district picker (dropdown of `District` records) that stores a FK on
   `RotaryInfo` and routes the new member to the correct district admin's queue.

3. **Listing approval gate** *(build)*
   — `createBusiness` in `backend/services/business.ts` never sets `status`; the schema default
   is `ACTIVE`, so every new listing is instantly searchable. It must default to `PENDING`
   (or `DRAFT`), be invisible in search until a district admin approves it, and the admin queue
   must expose a listing moderation view alongside member verification.

4. **Payment / membership fee** *(build — needs payment provider choice)*
   — No billing code exists anywhere. Registration must gate entry to the verification queue
   behind a successful payment. Choose a provider (Stripe recommended) before starting.

5. **Reviews + star ratings** *(build)*
   — No `Review`/`Rating` model in the schema; no reviews anywhere in the UI. Add the model
   (reviewer FK → `User`, business FK → `Business`, rating 1-5, body text, `createdAt`),
   server actions to create/read reviews (verified members only), and surface ratings in search
   ranking and on business detail pages.

6. **Geo search + sort options** *(rewire — columns exist, wiring is missing)*
   — `Business.lat` and `Business.lng` columns exist in the schema but are never populated by
   `createBusiness`/`updateBusiness` and never queried by `backend/search/postgres.ts`. Wire up:
   geocode on write (a geocoding provider call when `addressLine`/`city`/`country` changes),
   add `lat`/`lng`/`radiusKm` to `SearchParams`, implement `ST_Distance`-based filtering, and
   expose distance/rating/recency as user-selectable sort options.

7. **Management oversight dashboard** *(build)*
   — `/admin` today is only the verification queue. The management account needs: a
   cross-district stats overview (member counts, pending queues per district, revenue, review
   activity), district CRUD (create district, assign/reassign district admin), and the ability
   to override any district-level decision (approve/reject from the management view).

> **Note on 4 & 6:** Payment and geocoding require external provider accounts (Stripe / a
> geocoding API). Choose providers before starting those pillars.
