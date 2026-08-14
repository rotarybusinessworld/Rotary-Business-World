# Week 1 — The Migration Reset

Working checklist for the Tier 1 schema changes in `CLAUDE.md`. Zero users, zero production data —
this is the only week these are free.

**Blast radius, measured:** `Role` enums 13 files · `hasPaid` 12 files · `UserStatus` 24 files ·
`BusinessStatus` 13 files. Most of it is mechanical.

---

## Ground rules for the week

**Work on one branch. Do not generate a migration per change.**

Use `prisma db push` all week — it syncs the schema to your disposable local DB with no migration
files. Only at the very end do you `migrate reset` and generate a single `init`. Generating eight
migrations and then squashing them is pure friction.

```bash
npx prisma db push --force-reset    # during the week, after each schema edit
npm run db:seed                     # reseed
npm run typecheck                   # after each step — this is your progress bar
```

**Order matters.** Mechanical renames first (large blast radius, zero logic change), then logic
changes, then additive models. Doing it the other way means the logic work gets rebased under you.

**⚠️ TypeScript will not catch raw SQL.** Three places hold enum values as strings:
- `prisma/sql/search.sql` — the generated columns and indexes
- `src/backend/search/postgres.ts` — `status = 'ACTIVE'` appears ~7 times
- `prisma/seed.ts` / `prisma/seed-businesses.ts`

Grep for old enum values after every rename. Typecheck passing means nothing here.

---

## Day 1 — Enum renames (mechanical)

Pure find-and-replace. No behaviour changes. Get them out of the way so later days aren't rebasing.

### 1.1 `Role`

```
CLUB_ADMIN  → DISTRICT_ADMIN
SUPER_ADMIN → MANAGEMENT
```

**Files (13):** `auth-helpers.ts` · `actor.ts` · `actions/admin.ts` ·
`services/admin-management.ts` · `services/business-moderation.ts` ·
`services/verification-queue.ts` · `app/admin/layout.tsx` · `app/admin/page.tsx` ·
`app/admin/listings/page.tsx` · `frontend/site-header.tsx` · `scripts/make-admin.ts` ·
`shared/types/next-auth.d.ts` · `schema.prisma`

Rename the helpers too while you're in there — `requireSuperAdmin()` → `requireManagement()` — or
the naming mismatch just moves from the enum to the function names.

### 1.2 `BusinessStatus`

```
ACTIVE → APPROVED
+ add REJECTED
DRAFT stays = "owner hasn't submitted yet" (it no longer doubles as rejected)
```

**Files (13):** `services/business.ts` · `services/business-moderation.ts` ·
`actions/business-moderation.ts` · `search/postgres.ts` **(raw SQL ×7)** ·
`app/dashboard/page.tsx` · `app/business/[slug]/page.tsx` · `app/member/[id]/page.tsx` ·
`app/admin/page.tsx` · `app/admin/listings/page.tsx` · `prisma/sql/search.sql` **(raw SQL)** ·
`seed-businesses.ts` · `schema.prisma`

Then wire `REJECTED` properly: the moderation reject action sets `REJECTED` + a reason, and the
owner's dashboard shows it with a "revise and resubmit" path back to `PENDING`.

**Verify:** `grep -rn "CLUB_ADMIN\|SUPER_ADMIN\|'ACTIVE'\|\"ACTIVE\"" src/ prisma/ scripts/` → empty.

---

## Day 2 — `UserStatus` state machine (the big one)

24 files. This is logic, not find-and-replace. Budget the whole day.

### 2.1 New enum, drop `hasPaid`

```prisma
enum UserStatus {
  REGISTERED            // account created, email unconfirmed
  PAYMENT_PENDING       // email confirmed, awaiting payment
  PENDING_VERIFICATION  // paid, sitting in the district queue   ← old PENDING + hasPaid=true
  VERIFIED
  REJECTED
  SUSPENDED             // NEW — admin takedown
}
```

`User.hasPaid` is deleted. It was the second source of truth.

### 2.2 `backend/state/user-status.ts` — new file

```
assertTransition(from, to)   // throws on illegal jumps

REGISTERED           → PAYMENT_PENDING
PAYMENT_PENDING      → PENDING_VERIFICATION
PENDING_VERIFICATION → VERIFIED | REJECTED
VERIFIED             → SUSPENDED
SUSPENDED            → VERIFIED
```

Every status write goes through it, in the same transaction as its `audit_log` row.

### 2.3 Rewrite the auth helpers

`requirePaid()` currently does an extra DB read for `hasPaid`. It becomes a pure status check —
one less query on every gated page.

```
requireUser()        → session exists
requirePaid()        → status ∈ {PENDING_VERIFICATION, VERIFIED}
requireVerified()    → status === VERIFIED
requireAdmin()       → role ∈ {DISTRICT_ADMIN, MANAGEMENT}
requireManagement()  → role === MANAGEMENT
```

Add a `SUSPENDED` branch that redirects to a "your account is suspended" page — not to `/login`,
which produces a confusing redirect loop.

**Files:** `auth-helpers.ts` · `actor.ts` · `auth.ts` · `services/registration.ts` ·
`services/payment.ts` · `services/verification-queue.ts` · `services/admin-management.ts` ·
`services/business.ts` · `messaging/service.ts` · `verification.ts` ·
`shared/types/next-auth.d.ts` · `api/upload/route.ts` · 8 page/component files ·
`seed-businesses.ts` · `make-admin.ts`

### 2.4 Note on the JWT

Leave `auth.ts` reading `status` from the token today — the **cached `getActor()`** rewrite is
Week 2, and it depends on Redis. Just make sure the enum values are right so Week 2 is a swap and
not a second refactor.

Clear your dev cookies after this — old JWTs carry dead enum values.

---

## Day 3 — Payment correctness

### 3.1 Schema

```prisma
enum PaymentStatus { CREATED  AUTHORIZED  CAPTURED  FAILED  REFUNDED }

model Payment {
  razorpayOrderId   String   @unique          // now required
  razorpayPaymentId String?  @unique          // null until capture
  status            PaymentStatus @default(CREATED)
  settledAt         DateTime?
  // drop the Stripe columns entirely — Stripe is being deleted anyway
  @@index([status, createdAt])                // the reconciliation query
}

model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String                          // "razorpay"
  eventId     String   @unique                // idempotency
  eventType   String
  payload     Json
  status      String   @default("RECEIVED")
  receivedAt  DateTime @default(now())
  processedAt DateTime?
  error       String?
  @@index([provider, receivedAt])
}
```

### 3.2 Code

- **`/api/razorpay/order`** — write the `Payment` row (`status: CREATED`) **before** returning the
  order ID. This is the whole point: right now nothing is persisted, so a lost webhook leaves a
  member who paid with no DB trace at all.
- **`recordMembershipPayment()` → `settlePayment()`** — transitions `CREATED → CAPTURED`, sets
  `settledAt`, moves the user `PAYMENT_PENDING → PENDING_VERIFICATION`, writes audit. Keep it in
  the `server-only` module. Keep the `createMany({skipDuplicates})` idempotency.
- **Webhook route** — insert into `WebhookEvent` first (`ON CONFLICT DO NOTHING`); if zero rows
  inserted it's a replay, return 200 immediately.

### 3.3 Delete Stripe

`stripe` dep · `/api/stripe/*` · `PaymentSource.STRIPE` · the Stripe columns · `.env.example`
entries. One payment path.

**Don't write the reconciliation job yet** — it needs the worker (Week 2). The schema is what
makes it possible; that's this week's job.

---

## Day 4 — Media as keys, not URLs

### 4.1 Schema

Replace `Business.logoUrl`, `Business.coverUrl`, and `BusinessImage` with one model:

```prisma
model MediaObject {
  id        String   @id @default(cuid())
  ownerType String                          // BUSINESS | USER | DISTRICT
  ownerId   String
  role      String                          // logo | cover | gallery | avatar
  baseKey   String                          // "biz/{businessId}/{mediaId}"
  variants  Json                            // {"thumb":"…","card":"…","full":"…"}
  width Int  height Int  bytes Int  mime String
  blurhash  String?
  sortOrder Int      @default(0)
  status    String   @default("READY")
  createdAt DateTime @default(now())
  @@index([ownerType, ownerId, role, sortOrder])
}
```

### 4.2 Code

- **`backend/storage/keys.ts`** — new file, **the only place S3 keys are constructed.**
  Format `biz/{businessId}/{mediaId}/{variant}.webp` — identity only, never status/district/
  category, or approving a listing means copying every object.
- **`backend/storage/url.ts`** — `mediaUrl(media, variant)` built from `MEDIA_CDN_URL`. No row
  ever stores a hostname again.
- Update `business-form.tsx`, `image-upload.tsx`, `business-gallery.tsx`, `profile-form.tsx`, and
  the `shared/image.ts` helper.

Derivatives, EXIF stripping, and presigned uploads are **Week 3**. This week is only the shape of
the data — that's the part that's expensive later.

---

## Day 5 (morning) — Taxonomy, offerings, geography

Additive, lowest risk. Full rationale in `docs/NEEDS-LEADS.md` §3.

### 5.1 `Category` → 3 levels

```prisma
model Category {
  parentId String?
  parent   Category?  @relation("CategoryTree", fields:[parentId], references:[id])
  children Category[] @relation("CategoryTree")
  path     String                    // "automotive/tyres-tubes/truck-tyres"
  depth    Int      @default(0)
  isLeaf   Boolean  @default(true)
  synonyms String[] @default([])
  @@index([path])
}
```

`Industry` stays as level 0 — it's already the search facet, no reason to disturb it. Maintain
`path` in code on create/rename; subtree queries are `WHERE path LIKE :prefix || '%'`.

**Seeding: scaffold + samples.** Build the structure and seed 2–3 fully worked 3-level branches as
the pattern (Automotive › Tyres & Tubes › Truck Tyres, and similar). The real Rotary business
taxonomy is a content decision for a domain expert, not an engineering one — leave a clear TODO
and a seed format they can fill in.

### 5.2 `BusinessOffering`

```prisma
model BusinessOffering {
  id         String   @id @default(cuid())
  businessId String
  categoryId String
  title      String?
  keywords   String[] @default([])
  isActive   Boolean  @default(true)
  @@unique([businessId, categoryId])
  @@index([categoryId, isActive])
}
```

**Cap 20 per business**, enforced in the service layer, constant in
`backend/config/guardrails.ts`. `Business.categoryId` stays as the primary display category.

### 5.3 `Business` geography

```prisma
districtId   String        // denormalized from owner.rotaryInfo — REQUIRED
stateCode    String?
serviceReach ServiceReach @default(DISTRICT)
receiveLeads Boolean      @default(true)

enum ServiceReach { DISTRICT  STATE  NATIONAL  INTERNATIONAL }
```

⚠️ `districtId` is required, so **every** `createBusiness` path and both seed files must supply it.

Simplify `/admin/listings` while you're here — the current nested
`{ owner: { rotaryInfo: { districtId } } }` filter becomes a direct column match.

---

## Day 5 (afternoon) — Squash and verify

```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init        # one clean migration
npm run db:search                         # reapply generated columns
npm run db:seed
npm run typecheck
npm run build
```

### Verification

- [ ] `grep -rn "CLUB_ADMIN\|SUPER_ADMIN\|hasPaid\|'ACTIVE'\|logoUrl\|coverUrl" src/ prisma/ scripts/` → clean
- [ ] `prisma/sql/search.sql` uses `APPROVED`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run db:setup` works from a dropped database
- [ ] `npm run make-admin -- me@x.com` grants `MANAGEMENT`
- [ ] Smoke: register → pay (Razorpay **test mode**) → `Payment` row exists at `CREATED`
      *before* checkout opens → capture → status `PENDING_VERIFICATION` → admin approves →
      `VERIFIED` → create listing → `PENDING` → approve → appears in search
- [ ] A district admin sees only their district in `/admin/verifications` and `/admin/listings`
- [ ] Suspending a member blocks access on the next request

That smoke test is the real acceptance criterion. Typecheck only proves it compiles.

---

## Explicitly NOT this week

Magic-link auth · `getActor()` caching · Redis · the worker · reconciliation job · Resend ·
rate limiting · EXIF/magic-bytes/derivatives · roster bulk-approve · anything Needs/Leads beyond
the three schema models.

Week 1 is schema and the code required to keep it compiling. Resist scope creep — the value here
is landing all eight changes in one migration while that's still free.

---

## Two things to do before Day 1

Not code, and they have multi-week lead times that gate your launch date:

1. **DLT registration** (TRAI, India SMS) — 3–4 weeks
2. **Resend production access** + domain verification (SPF/DKIM) — with magic-link auth, email
   *is* your login
3. Razorpay live KYC · WhatsApp BSP onboarding if you want that channel

Thirty minutes of forms. Starting them in Week 3 costs you the launch date.
