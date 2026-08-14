@AGENTS.md

# Rotary Business World

A private, verified business directory for Rotarians — **trust is local, value is global.**
Each district admin vouches only for members they can plausibly know; once verified, a member
can search the entire worldwide directory.

> **Status: pre-launch. No real users, no production data.** Target launch ~mid-September 2026
> with ~2,000 invited members. Breaking schema changes are FREE right now — see
> [Change plan](#change-plan-pre-launch) below. Do not treat any table as sacred until launch.

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
| **District admin** | Their district only | Approve/reject member signups & business listings for their district |
| **Management account** | All districts | Cross-district stats + queues + revenue, create districts, assign district admins, override any district-level decision |

### The seven pillars

1. **Pay first.** Register, pick home district, pay the fee. Payment puts you in the district's
   review queue — **it does not grant access.**
2. **District admin verifies identity** against the roster or local knowledge. Manual on purpose:
   this is the trust mechanism, not something to automate away.
3. **Listing approval gate.** A new business stays **PENDING** (invisible in search) until the
   district admin approves it.
4. **Global search, local trust.** Approved listings are discoverable platform-wide: keyword,
   location, industry/category filters, sorting by distance/rating/recency.
5. **Reviews.** Only verified members rate and review.
6. **Management oversight.** Cross-district stats, district CRUD, admin assignment, override.
7. **Structural growth.** New district goes live by creating the record + assigning an admin.
   No code change required.

---

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) + React 19 — deployed on **Railway**
- **Tailwind v4** (`@theme` in `src/app/globals.css`) — deep navy `#0b1226` + gold `#c9a24c`,
  Fraunces for headings, Inter for body. Dark navy chrome, light editorial content.
- **Brand assets** in `public/brand/`: `rbw-logo.jpg`, `rbw-mark.jpg`
- **Prisma 6** + **PostgreSQL** (pinned to 6 on purpose — 7 forces driver adapters we don't need)
- **Auth.js v5** (Credentials + JWT today; **moving to email magic link** — see change plan).
  Gate access with `await auth()` in layouts/pages — **no middleware/proxy**
- **AWS S3** (`ap-south-1`) for image uploads, behind `backend/storage`
- **Razorpay** for membership payment (UPI/cards/netbanking). Stripe code also present but
  **being removed** — Razorpay is the only path going forward.
- Search: Postgres `tsvector` + `pg_trgm`, behind `backend/search` (swappable for Typesense later)
- **Not yet present, planned:** Redis, a background worker, email sending

### Companion specs

- [`docs/NEEDS-LEADS.md`](docs/NEEDS-LEADS.md) — Needs/Leads feature, IndiaMART matching pattern.
  **Its steps 1–3 are Tier 1 schema work** (taxonomy depth, `BusinessOffering`, `Business`
  geography) — they land in the pre-launch migration reset even though the feature ships later.

### Deliberate non-choices

Do **not** propose migrating to Drizzle, tRPC, or a monorepo. ~13k lines of working Prisma +
Server Actions exist; the swap costs weeks and buys nothing a member would notice. Prisma 6 and
Server Actions are fine well past our scale ceiling.

---

## Project structure

One Next.js app — **not** a separate API server:

```
src/
  frontend/   # all UI components (ui/, brand/, dashboard/, search/, admin/, messages/)
  backend/    # all server-side code: db, auth, services/, actions/ (Server Actions),
              #   search/, storage/, messaging/, verification, roster, taxonomy,
              #   auth-helpers, actor, audit, errors, env, logger
  shared/     # used by both sides: validators (zod), utils, types/
  app/        # Next.js routes/pages — Next PINS the router here. Treat it as the
              #   frontend's "front door": thin pages wiring @/frontend to @/backend.
```

Path alias `@/*` → `src/*`. Auth.js config is `backend/auth.ts`. The only server code outside
`backend/` is what Next requires in `app/`: `app/api/*` route handlers (thin — validate, then
call `@/backend/*`) and Server Component pages.

**Planned addition:** `src/worker/` — BullMQ consumers + repeatable jobs, run as a second
Railway service from the same repo.

---

## Local dev

Postgres is a throwaway Homebrew cluster on **port 5544** (see `.env`). If it's not running:

```bash
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D /tmp/rbw-pgdata -o "-p 5544 -k /tmp" -l /tmp/rbw-pg.log start
```

```bash
npm run dev              # dev server (http://localhost:3000)
npm run db:deploy        # apply migrations
npm run db:seed          # seed taxonomy + sample districts/clubs/roster
npm run db:import-roster -- roster.csv   # import the real global roster (re-runnable)
npm run make-admin -- <email>            # bootstrap an admin
npm run typecheck        # tsc --noEmit
npm run build            # production build
```

Scripts run through `node --env-file=.env --import tsx` because tsx (unlike the Prisma CLI)
does not auto-load `.env`.

---

## Architecture notes

- **Search vector** (`Business.searchVector`) is a `GENERATED ALWAYS … STORED` tsvector managed
  by `prisma/sql/search.sql` (`npm run db:search`). Declared `Unsupported("tsvector")?` so Prisma
  treats it as opaque. The old `business_search_vector_trigger` was removed — it conflicted with
  the generated column and made every business INSERT/UPDATE throw. **`Business.searchText`** is a
  second generated column concatenating searchable fields, backing a GIN trigram index for fuzzy
  matching.
- **Search layer**: `getSearchService()` in `backend/search` returns the `SearchService` interface;
  only `postgres.ts` implements it. Swap here, not in callers. Every query path — including
  autocomplete — filters `status = 'ACTIVE'`.
- **Verification** (`backend/verification.ts`): computes a roster match score for the admin queue.
  **Every registration lands PENDING regardless of match quality** — only a district admin can
  grant VERIFIED. The "already claimed" guard runs at approval time, backed by
  `@@unique(matchedRosterId)`.
- **District scoping**: `getAdminScope()` in `backend/auth-helpers.ts` returns
  `managedDistrictId` (null = MANAGEMENT/all districts). It **fails closed** — a district admin
  whose district was deleted gets redirected, never falls through to unscoped access.
  `assertDistrictScope()` in `services/verification-queue.ts` blocks IDOR on individual records.
- **Payments**: `recordMembershipPayment()` is the single idempotent entry point. It lives in a
  `server-only` module and **not** a `"use server"` file on purpose — every export of a
  `"use server"` module is network-callable, so exposing it there would let anyone grant themselves
  paid access. Idempotency via `createMany({ skipDuplicates })` on the unique payment ID inside a
  transaction.
- **Razorpay webhook** (`app/api/razorpay/webhook/route.ts`): raw body via `req.text()`,
  HMAC-SHA256, `timingSafeEqual` with a length check. Never add a body parser to this route.
- **Listing gate**: `createBusiness` sets `status: "PENDING"` explicitly — never rely on the schema
  default. Material edits to an `ACTIVE` listing flip it back to `PENDING` while the live version
  stays up.
- **Messaging** (`backend/messaging/`): isolated bounded context. 1:1 only; participants stored in
  canonical order so `@@unique` dedups a pair and get-or-create is one atomic upsert. Unread is
  derived, not stored.
- **Audit log**: append-only, never updated or deleted in code. Nullable `actorId` so system events
  survive user deletion.
- **Mobile-first**: all new screens are designed phone-first (base Tailwind = 375px;
  `sm:`/`md:`/`lg:` enhance upward). Desktop is derived, not the default.

---

## Status — what is actually built

**Six of the seven pillars are done.** (This section was badly stale before 2026-08-14; if you
find it disagreeing with the code again, trust the code and fix this file.)

| Pillar | State |
|---|---|
| 1. Pay first | ✅ Razorpay orders + verify + webhook + `Payment` model + audit. `hasPaid` gates access via `requirePaid()`. |
| 2. District admin verifies | ✅ `/admin/verifications`, roster auto-match scoring, approve/reject, district-scoped, IDOR-guarded |
| 3. Listing approval gate | ✅ `PENDING` on create, `/admin/listings` moderation, search filters `ACTIVE` |
| 4. Global search | ✅ FTS + trigram + industry/country facets + autocomplete + "similar businesses" rail. **Geo/distance not wired.** |
| 5. Reviews | ✅ `Review` model, forms, lists, one-per-member constraint |
| 6. Management oversight | ✅ `/admin/districts` — create district, create club, assign district admin. **Cross-district stats dashboard still thin.** |
| 7. Structural growth | ✅ New district = create record + assign admin, no code change |

**Also built (not in the original concept):** member-to-member direct messaging with blocks,
member profiles, business galleries, premium navy/gold theme, `pino` logging, `/api/health`.

**Storage:** `backend/storage` picks S3 when env vars are set, else writes `public/uploads/`
(dev only). Uploads go through `POST /api/upload` (verified users, 5 MB, image types).

### Genuinely not built

- **Geo search** — `Business.lat`/`lng` exist but are never populated or queried
- **Needs/Leads** — the "I need tyres, wholesale" → notify matching businesses feature
- **Email sending** — no service at all (see blockers below)
- **Redis / background worker / job queue** — everything is synchronous today

---

## Known issues (verified 2026-08-14)

Ordered by risk. Several are cheap now and expensive after launch.

### 🔴 Blockers

1. **No email sending.** `registration.ts` mints verification tokens; nothing delivers them.
   `EMAIL_FROM`/`SMTP_URL` are placeholders. Becomes doubly critical once auth is magic-link.
2. **Payment reconciliation is impossible.** `/api/razorpay/order` creates the Razorpay order and
   **persists nothing** — a `Payment` row only appears on capture. A lost webhook means the member
   paid, is stuck forever, and there is no DB record they ever started. Needs a row at
   order-create time.
3. **`bcryptjs` at cost 12** — pure-JS bcrypt, ~300–600 ms of **event-loop-blocking** CPU per hash.
   At a burst of ~20 signups/sec this saturates the instance and blocks every other request.
   Being removed entirely with magic-link auth.
4. **No roster bulk-approve.** Admins face a flat list, one button per row. 2,000 signups across
   ~5–20 volunteer admins means it doesn't get done.

### 🟠 High

5. **JWT carries stale `role`/`status`.** `auth.ts` bakes them into the token at sign-in and never
   refreshes. An approved member still sees "pending" until they log out; a **suspended member
   keeps access** until token expiry. (`requirePaid()` already re-reads `hasPaid` from the DB,
   which is a partial workaround.)
6. **No rate limiting** anywhere — login, register, upload, order-create all unbounded.
7. **No idempotency** on register or order-create. Double-tap on mobile → duplicate Razorpay orders.
8. **Uploads proxied through the app server** — `/api/upload` buffers whole files into app memory.
9. **No EXIF stripping.** Phone photos carry GPS — a member uploading a shopfront photo taken at
   home publishes their address. **Privacy leak.**
10. **`Content-Type` is trusted.** `ALLOWED[file.type]` uses the client-declared type; no magic-byte
    check, so a `.jpg` that is actually an SVG gets through.
11. **Dual Stripe + Razorpay** — two payment paths, two webhooks, two failure modes.

### 🟡 Medium

12. **Media stored as full URLs** (`logoUrl`, `coverUrl`, `BusinessImage.url`) — hard-codes the CDN
    host into every row; changing CDN or adding derivatives becomes a data migration.
13. **`hasPaid` boolean separate from `UserStatus`** — two sources of truth for "can this person
    do things."
14. **`CLUB_ADMIN` naming** — the product says *district admin*; the enum says club.
15. **No image derivatives** — full-size images served to phones.
16. **No CloudFront** — public S3 bucket, paying full egress.
17. **`DEMO` payment source** is refused in production via `NODE_ENV`. Verify that check is real and
    tested — a deploy where `NODE_ENV` isn't `production` would grant free membership.

---

## Change plan (pre-launch)

**Context: zero users, zero production data, ~1 month to launch.** This is the only window where
schema, auth, and storage-format changes are free. They cost one migration today and a
backfill + dual-write + three-release dance after launch.

**Guiding rule:** *no users* discounts **data and contract changes** to near-nothing. It discounts
**code rewrites** by exactly zero. So break the schema freely; do not rewrite working code.

### Tier 1 — do now (free today, expensive forever after)

| # | Change | Why now |
|---|---|---|
| **1** | **Passwords → email magic link.** Remove Credentials provider, drop `User.passwordHash`, delete `backend/password.ts`. | Kills the bcrypt CPU bomb permanently AND deletes password-reset — **a feature we haven't built yet, so this is strictly less work than staying.** Phone OTP later: India SMS needs DLT registration (3–4 weeks), so start that paperwork in parallel and ship email first. Keep collecting `phone` at signup — admins need it to verify identity and it's the WhatsApp channel later. |
| **2** | **JWT = identity only.** Add cached `getActor()` reading `role`/`status`/`managedDistrictId` from the DB (Redis-cached, 300s), invalidated **synchronously** inside approve/reject/suspend transactions. | Approval takes effect on the next page load; suspension is immediate. |
| **3** | **Persist the payment order at creation.** `PaymentStatus` → `CREATED \| AUTHORIZED \| CAPTURED \| FAILED \| REFUNDED`. `razorpayOrderId` required + unique. Add `settledAt`, `@@index([status, createdAt])`. Add a `webhook_events` table (`event_id` unique). | Makes reconciliation possible at all. |
| **4** | **Collapse `hasPaid` into `UserStatus`**: `REGISTERED \| PAYMENT_PENDING \| PENDING_VERIFICATION \| VERIFIED \| REJECTED \| SUSPENDED`. Add `assertTransition(from, to)`. | One source of truth; adds the missing SUSPENDED state. |
| **5** | **Rename `CLUB_ADMIN` → `DISTRICT_ADMIN`**, `SUPER_ADMIN` → `MANAGEMENT`. | Permanent semantic mismatch with the product concept otherwise. |
| **6** | **Store media keys, not URLs.** New `MediaObject` model (`baseKey`, `variants` jsonb, dimensions, blurhash). Build URLs at read time from `MEDIA_CDN_URL`. Key format `biz/{businessId}/{mediaId}/{variant}.webp` — **encode identity only, never mutable state** (status/district/category in a key means approval requires copying every object). | Zero images uploaded today. Later it's a copy-every-object migration. |
| **7** | **`BusinessStatus`**: rename `ACTIVE` → `APPROVED`, add explicit `REJECTED`. | `DRAFT` currently doubles as "rejected" — two meanings in one state. |
| **8** | **Taxonomy depth 2 → 3 levels.** `Category` gets `parentId`, materialized `path`, `depth`, `synonyms[]`. Keep `Industry` as level 0 (it's the search facet). Subtree matching = `WHERE path LIKE :prefix || '%'` — index-friendly, no recursive CTE. | Two levels can only express "Printing," never "Packaging Printing." Lead matching is only as precise as the taxonomy is deep. Reseeding an empty tree is free. |
| **9** | **`BusinessOffering` — a seller catalog.** Many rows per business, each a leaf category + title + keywords. **Cap 20 per business** (anti-gaming). `Business.categoryId` stays as the primary/display category; offerings drive *matching only*. | The keystone for accurate lead notifications — see `docs/NEEDS-LEADS.md` §3.1. One category per company means a printer gets every printing lead, opts out, and never comes back. |
| **10** | **`Business` geography**: add `districtId` (denormalized from owner), `stateCode`, `serviceReach` enum (`DISTRICT\|STATE\|NATIONAL\|INTERNATIONAL`), `receiveLeads Boolean`. | `Business` currently has **no `districtId`** — district is reached via `owner.rotaryInfo.districtId`, two joins, and it breaks if an owner moves district. `serviceReach` is what lets a Chennai need reach a Mumbai supplier — i.e. what makes "value is global" true for leads too. |
| **11** | **Squash the 10 exploratory migrations** into one clean `init`. | Empty DB. Free. |

### Tier 2 — do early (compounding benefit)

9. **Redis + worker on Railway.** Redis plugin + a `worker` service pointing at the same repo
   (`npm run worker`). Use **BullMQ repeatable jobs**, not Railway cron — the worker is always on,
   so no cold boots and one less concept. ⚠️ Configure Redis `maxmemory-policy noeviction` + AOF:
   BullMQ on an LRU Redis **silently drops jobs** under memory pressure.
10. **Email via Resend** (not Hostinger SMTP) — better deliverability, and with magic-link auth a
    login email landing in spam is fatal.
11. **Delete Stripe.**
12. **Rate limiting + idempotency helpers** — Redis sliding window; `Idempotency-Key` on register
    and order-create. Build them early so new endpoints use them by default.
13. **`env.ts` fails closed in production** if S3 is unconfigured — Railway's filesystem is
    ephemeral and the `local.ts` fallback loses photos silently.

### Tier 3 — explicitly not doing

Drizzle · tRPC · monorepo · rewriting the scoping model. The scoping, payment idempotency,
`server-only` reasoning, `timingSafeEqual` webhook, PENDING-by-default listings, edit-while-live
flow, and ACTIVE-filtered autocomplete are all correct — leave them alone.

### Schedule

Start **today, in parallel** (they gate everything): DLT registration (India SMS) · WhatsApp BSP
onboarding · Resend production access · Razorpay live KYC.

| Week | Focus |
|---|---|
| **1** | All of Tier 1 as **one migration reset**. Enum renames → `UserStatus` state machine → payment order-at-creation → `MediaObject` → `BusinessStatus` → taxonomy depth → `BusinessOffering` → `Business` geography → clean `init`. |
| **2** | Magic-link auth · `getActor()` · Railway Redis + worker · Resend + templates |
| **3** | Reconciliation job + alerting · rate limits + idempotency · **roster CSV import + confidence bucketing + bulk approve** · upload hardening (magic bytes, EXIF strip, sharp derivatives) |
| **4** | Presigned direct-to-S3 + CloudFront (optional) · k6 signup-burst test (**watch event-loop lag**) · Razorpay test matrix (success/failure/duplicate/out-of-order/closed-tab) · Sentry + alerts + **tested backup restore** · **Wave 0**: 20 real members, real money, real refund |
| **buffer** | Wave 1 (one district) → widen in waves |

**Not in this month:** the Needs/Leads *runtime* (posting form, matching job, digest) and geo
search. But **its schema lands in week 1** — see Tier 1 #8–#10. Retrofitting a seller catalog and
a taxonomy depth change onto live data is exactly the migration this window exists to avoid.

**Correction to the earlier plan:** we are *not* waiting to build an AI classifier for Needs.
Matching is a lookup problem, not a comprehension problem — IndiaMART, JustDial and Thumbtack all
use category-first structured intake with free text as descriptive colour only. Accuracy comes
from **seller-side declaration granularity** (`BusinessOffering` + a deeper taxonomy), not from
parsing the buyer's sentence better. Full reasoning in `docs/NEEDS-LEADS.md`.

### Launch design targets

- ~2,000 invited members, **burst signups** — peak ~10–20 registrations/sec, ~60–100 API RPS
- 3 Railway web replicas during the launch window (**pre-scale — don't rely on autoscaling for a
  burst you scheduled yourself**), 2 steady
- Reconciliation cron every 5 min during launch week, 15 min after
- **Stagger invitations into waves** — cuts peak load ~5×, is free, and is worth more than doubling
  capacity
- Scale ceiling to design toward, not build for: 25k concurrent. Path is Redis split → PgBouncer →
  read replica + partitioning → Typesense. Each step is config, not a rewrite.

---

## Roster bulk-approve (build in week 3 — biggest launch risk)

Not infrastructure — tooling. 2,000 pending verifications landing on volunteer admins with day
jobs. Most of the parts already exist (`RosterMember`, `papaparse`, `verifyAgainstRoster`, the
`gin_trgm_ops` index on `fullName`).

```
1. Admin uploads district roster CSV (name, email, phone, club, member ID)
2. Match pending signups:
     exact on email / phone / rotaryId       → HIGH confidence
     fuzzy name + club (pg_trgm)             → MEDIUM
     no match                                → NEEDS ATTENTION
3. Three grouped buckets in the queue, not one flat list
4. "Approve all N high-confidence" → ONE action, ONE confirm
5. Medium + unmatched get individual review
```

This preserves the trust model exactly — the admin still decides, and every approval writes its own
`audit_log` row with `decision_source: 'BULK_ROSTER_MATCH'`. It just stops making them click 400
times to express one judgment. Also: keyboard shortcuts (`J`/`K`/`A`/`R`), filters by club and
confidence, a progress indicator, and **one daily digest email at 09:00 — never one per signup.**

Pre-import every launch district's roster **before** invitations go out.

---

## Needs / Leads — the short version

Full spec: [`docs/NEEDS-LEADS.md`](docs/NEEDS-LEADS.md). What a session needs to know without
opening it:

- **Modelled on IndiaMART's lead-matching pattern.** Category-first structured intake; free text
  is displayed to the matched business but **never a matching signal**. No AI anywhere in v1.
- **Accuracy comes from the seller side.** Businesses declare a catalog of `BusinessOffering`
  rows (leaf category + title + keywords, max 20), not one company-wide category. Needs match
  *offerings*, then roll up to the business.
- **Geography is declared, not inferred.** `Business.serviceReach` (`DISTRICT`→`INTERNATIONAL`)
  vs `Need.reachWanted`. This is what lets a Chennai need reach a Mumbai supplier — "trust is
  local, value is global" applies to leads too, not just search.
- **Two-stage matching:** a hard SQL filter (approved · opted-in · category subtree via
  `path LIKE` · geography), then a 0–100 score (category precision 50 · geography 30 · keyword
  overlap 10 · quality 10 · **fairness penalty −4 per lead sent to that business in 7 days**).
- **Hard caps in `backend/config/guardrails.ts`** — constants in source, never DB-editable, never
  derived from user input:
  `NOTIFY_SCORE_MIN 45` · `MAX_RECIPIENTS 15/need` · `MAX_LEADS_PER_BIZ 10/7d` ·
  `MAX_NEEDS_PER_MEMBER 5/day` · `MAX_URGENT 1/week` · `MAX_OFFERINGS 20` · **kill switch**.
- **Daily digest at 09:00**, composed into *one* email per recipient alongside the admin
  verification digest — never two. Replies route through `backend/messaging/`; buyer contact
  details are never included.
- **Feedback loop replaces the classifier.** Every lead carries a one-click "Not relevant."
  A weekly job computes precision per offering and per category; **platform dismissal rate > 40%
  is an alert.** That's how matching improves — real member judgment, zero API cost.
- Matches below the score threshold are still recorded with `digestedAt` null. They cost nothing
  and they are the tuning dataset.

---

## Deployment (Railway + Hostinger + AWS S3)

**Railway** = app + Postgres + Redis + worker (co-located, private networking over
`*.railway.internal` is free and sub-ms — always use internal URLs, never the public proxy).
**Hostinger** = domain/DNS. **AWS S3** (`ap-south-1`) = uploads.

> **Object storage is required in production.** Without S3, `backend/storage` falls back to
> `public/uploads/`. On Railway the filesystem is ephemeral — uploads vanish on redeploy and aren't
> shared across replicas. Make this fail closed at boot (Tier 2 #13).

**1. AWS S3:** bucket in `ap-south-1`. Public read via a **bucket policy** (or CloudFront), not
per-object ACLs — modern buckets are "bucket owner enforced" and the upload code sends no ACL.
`NEXT_PUBLIC_S3_PUBLIC_HOSTNAME` = public host, no protocol. IAM user with `s3:PutObject` only.

**2. Railway:** Postgres plugin → `DATABASE_URL` (add
`?connection_limit=10&pool_timeout=20`). Redis plugin → `REDIS_URL`. Env: `AUTH_SECRET`
(`npx auth secret`), `AUTH_URL`, S3 vars, `RAZORPAY_*`, `RESEND_API_KEY`, `EMAIL_FROM`.
Build/start = `npm run build` / `npm start`. Worker service = same repo, `npm run worker`.
Healthcheck → `/api/health` (extend it to check Redis once added).

**3. Hostinger:** point DNS at the Railway app; set `AUTH_URL` to that domain.

**4. First deploy:** `npm run db:setup` (migrate deploy + search SQL + seed), then
`npm run make-admin -- <email>`, then `npm run db:import-roster -- roster.csv`.

Sessions are JWT so the app scales horizontally. Past ~6 instances, add PgBouncer as a Railway
service.

---

## Working agreements

- **Trust the code over this file.** If Status or Known Issues disagrees with what you read in
  `src/`, the code is right — fix this file in the same PR.
- **Pre-launch: breaking changes are encouraged.** Don't write a backwards-compatible migration for
  a table with zero rows.
- **Never rely on a schema default for a security-relevant field** — set it explicitly in code, the
  way `createBusiness` does with `PENDING`.
- **Every admin query must be district-scoped** through `getAdminScope()` / `assertDistrictScope()`.
  Management bypass is an explicit branch that writes an `audit_log` row — never an unscoped query.
- **Money and access changes go in one transaction** with their audit row.
- **New side effects go in a job**, not inline in a request, once the worker exists.
