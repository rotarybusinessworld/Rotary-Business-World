# Needs / Leads — IndiaMART-pattern Implementation Spec

> **Read `CLAUDE.md` first** for stack, conventions, current status, and the change plan.
> This document specifies the Needs/Leads feature and the schema changes it requires.
> Several of those changes are **Tier 1 (pre-launch, free now)** — see §11.

**Status:** spec, not built. **Depends on:** Tier 1 schema work, Tier 2 #9 (Redis + worker),
Tier 2 #10 (Resend). **Do not build a synchronous stopgap.**

---

## 1. What IndiaMART actually does

Most descriptions of IndiaMART focus on the buyer's form. That's the visible part, not the part
that makes matching work. The mechanism is four things, and **three of them are on the seller
side**:

| # | Mechanism | What it means |
|---|---|---|
| **1** | **Deep leaf taxonomy** | ~100k leaf nodes. Not "Automotive" — `Automotive › Tyres & Tubes › Truck Tyres › Radial Truck Tyres`. Matching happens at the leaf. |
| **2** | **Sellers publish a product catalog, not a company category** | A seller doesn't pick one category. They list every specific product/service they supply. Leads match **catalog entries**, not companies. |
| **3** | **Sellers declare serviceable geography** | Separate from where they're *located*. A Coimbatore wholesaler may serve all of Tamil Nadu, or all of India. Location ≠ reach. |
| **4** | Buyer picks a category, then answers category-specific attributes | Quantity, spec, purpose. Free text is supplementary. |

**The accuracy insight: precision comes from seller-side declaration granularity, not from
parsing the buyer's text better.** You cannot match accurately against a business that has
declared one broad category, no matter how good your intake form or your classifier is.

That is exactly RBW's current situation.

---

## 2. Why RBW can't match accurately today

| Current state | Consequence |
|---|---|
| `Business.categoryId` — **one** category per business, and it's **nullable** | A printing company is "Printing." It receives every printing need in the district — offset, digital, packaging, signage, business cards. Most are irrelevant. It opts out. Permanently. |
| Taxonomy is **2 fixed levels** (`Industry › Category`) | "Printing" is as specific as the system can express. There is no "Packaging Printing" to match against. |
| `Business` has **no `districtId`** | District is reached via `owner.rotaryInfo.districtId`. Two joins, and it silently breaks if an owner changes district. |
| No concept of **serviceable area** | Matching can only be "same district," which contradicts *"trust is local, value is **global**."* |

Any Needs feature built on this schema will produce low-precision notifications, businesses will
opt out, and the feature dies. **The schema changes below are the feature.** The form and the
digest are the easy parts.

---

## 3. The four structural changes

### 3.1 🔑 Keystone: `BusinessOffering` — a seller catalog

This is the single change that makes accurate matching possible.

```
Business (the company — identity, contact, photos, reviews)
   └── BusinessOffering[]  (what it actually supplies — many rows)
          ├── categoryId   → leaf of the taxonomy
          ├── title        → "Radial truck tyres, wholesale"
          ├── keywords[]   → seller-supplied recall terms
          └── isActive
```

Needs match **offerings**, then roll up to the owning business. A tyre wholesaler declares
`Truck Tyres`, `Bus Tyres`, `Tyre Retreading` — and receives leads for exactly those, not for
`Car Tyres` or `Tyre Showrooms`.

**Cap offerings at 20 per business.** Without a cap, a business declares 200 offerings to catch
every lead and you've recreated the flood you were preventing. The cap is the anti-gaming control.

`Business.categoryId` stays as the **primary/display** category (used for the directory card,
facets, and search ranking). Offerings drive *matching only*. Keep both.

### 3.2 Taxonomy depth: 2 levels → 3

Keep `Industry` as level 0 (it's already the search facet). Make `Category` self-referential:

```
Industry              Automotive
  └ Category (L1)       Tyres & Tubes
      └ Category (L2)     Truck Tyres        ← offerings and needs attach here
```

Use a **materialized path** (`path` column, e.g. `automotive/tyres-tubes/truck-tyres`) rather
than a recursive CTE. Subtree matching then becomes an index-friendly prefix scan:

```sql
WHERE c.path LIKE :needCategoryPath || '%'
```

A need posted at `Tyres & Tubes` matches offerings at `Truck Tyres` **and** `Car Tyres` — that's
your recall. A need at `Truck Tyres` matches only truck tyres — that's your precision.

Add `Category.synonyms String[]` (`"tyre"`, `"tire"`, `"tayar"`) for search and for the
category picker's autocomplete.

### 3.3 `Business.districtId` — denormalized

Copy from `owner.rotaryInfo.districtId` at create time. Fixes the matching query, makes admin
scoping one join shorter, and means a member changing district doesn't silently reassign their
listing. Already recommended in the architecture notes for exactly this reason.

Also add `stateCode` — geography matching needs a middle tier between district and country.

### 3.4 `serviceReach` — where a business *serves*, not where it *sits*

```prisma
enum ServiceReach { DISTRICT  STATE  NATIONAL  INTERNATIONAL }
```

Declared per business (or per offering if you want the granularity later — start per business).

**This is what resolves the "trust is local, value is global" tension.** A Chennai member's need
reaches a Mumbai supplier who declared `NATIONAL`. It does not reach a Mumbai retailer who
declared `DISTRICT`. Geography stops being a hard co-location filter and becomes a declared,
scored attribute — which is exactly how IndiaMART handles it, and it's the correct read of the
product thesis.

---

## 4. Schema

```prisma
// ─── TAXONOMY ────────────────────────────────────────────────────────────────

model Category {
  id         String     @id @default(cuid())
  name       String
  slug       String     @unique
  industryId String
  industry   Industry   @relation(fields: [industryId], references: [id])

  parentId   String?
  parent     Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children   Category[] @relation("CategoryTree")

  /// Materialized path for subtree matching: "automotive/tyres-tubes/truck-tyres".
  /// Maintained in code on create/rename. Prefix-scanned with LIKE — no recursive CTE.
  path       String
  depth      Int        @default(0)
  isLeaf     Boolean    @default(true)
  /// Recall terms for the picker and search: ["tyre","tire","tayar"]
  synonyms   String[]   @default([])

  businesses Business[]
  offerings  BusinessOffering[]
  needs      Need[]

  @@unique([name, industryId])
  @@index([path])
  @@index([parentId])
}

// ─── SELLER CATALOG ──────────────────────────────────────────────────────────

model BusinessOffering {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])

  /// Seller's own words: "Radial truck tyres, wholesale, 10-16 inch"
  title      String?
  /// Seller-supplied recall terms, lowercased on write
  keywords   String[] @default([])
  minOrderQty String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  matches    NeedMatch[]

  @@unique([businessId, categoryId])   // one offering per category per business
  @@index([categoryId, isActive])
}

// ─── BUSINESS (additions) ────────────────────────────────────────────────────

model Business {
  // ... existing fields ...
  districtId   String                                    // NEW — denormalized from owner
  district     District     @relation(fields: [districtId], references: [id])
  stateCode    String?                                   // NEW — middle geo tier
  serviceReach ServiceReach @default(DISTRICT)           // NEW
  receiveLeads Boolean      @default(true)               // NEW — opt-out toggle

  offerings    BusinessOffering[]

  @@index([districtId, status])
  @@index([serviceReach, status])
}

enum ServiceReach { DISTRICT  STATE  NATIONAL  INTERNATIONAL }

// ─── NEEDS ───────────────────────────────────────────────────────────────────

enum NeedStatus  { OPEN  CLOSED  EXPIRED }
enum NeedUrgency { STANDARD  URGENT }
enum MatchFeedback { RELEVANT  NOT_RELEVANT }

model Need {
  id          String      @id @default(cuid())
  memberId    String
  member      User        @relation(fields: [memberId], references: [id])

  categoryId  String                                     // leaf preferred, any level allowed
  category    Category    @relation(fields: [categoryId], references: [id])

  districtId  String                                     // buyer's district
  district    District    @relation(fields: [districtId], references: [id])
  stateCode   String?
  country     String?
  /// How far the buyer is willing to source from. Drives the geo filter.
  reachWanted ServiceReach @default(STATE)

  quantity    String?     // "50 units", "wholesale" — displayed, never parsed for matching
  budgetMin   Int?
  budgetMax   Int?
  notes       String?     // supplementary free text — NEVER a matching signal

  urgency     NeedUrgency @default(STANDARD)
  status      NeedStatus  @default(OPEN)
  createdAt   DateTime    @default(now())
  expiresAt   DateTime                                   // set explicitly at create: now + 14d
  closedAt    DateTime?

  matches     NeedMatch[]

  @@index([status, categoryId, districtId])
  @@index([status, expiresAt])
}

model NeedMatch {
  id          String   @id @default(cuid())
  needId      String
  need        Need     @relation(fields: [needId], references: [id], onDelete: Cascade)
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  offeringId  String?                                    // which offering matched — for tuning
  offering    BusinessOffering? @relation(fields: [offeringId], references: [id])

  score       Int                                        // 0–100, see §6
  scoreBreakdown Json                                    // {category:50, geo:30, keyword:8, quality:6, fairness:-5}

  matchedAt   DateTime  @default(now())
  digestedAt  DateTime?                                  // included in a built digest
  sentAt      DateTime?                                  // digest email confirmed sent
  viewedAt    DateTime?
  feedback    MatchFeedback?                             // one-click from the digest
  feedbackAt  DateTime?

  @@unique([needId, businessId])                         // idempotency guard
  @@index([businessId, digestedAt])                      // "pending for this owner"
  @@index([businessId, sentAt])                          // weekly budget window
}
```

Idempotency mirrors the existing `@@unique(matchedRosterId)` and `recordMembershipPayment()`
patterns — matching uses `createMany({ skipDuplicates: true })` and is safe to re-run on retry.

---

## 5. Structured intake

Category-first, IndiaMART-style. Free text is never a matching signal.

```
1. Category      searchable picker over the tree, synonyms-aware, LEAF ENCOURAGED
                 ("Truck Tyres" ranks above "Tyres & Tubes"; picking a parent is allowed
                  but shows "this will reach more businesses — pick a specific type for
                  better matches")
2. Reach         "Where should this go?"  My district / My state / Anywhere in India / Worldwide
                 → sets reachWanted. Default STATE.
3. Quantity      short free text          "50 units", "wholesale", "one-off"
4. Budget        optional min/max
5. Notes         optional textarea        "Needed by month-end, must be BIS certified"
                 Displayed to matched businesses. NOT parsed.
6. Urgent        checkbox, rate-limited (see §7)
```

**No AI in this path.** The category picker is a tree search with synonyms. If real usage later
shows members fighting the picker, add an LLM-assisted *suggestion* on top — still confirmed by
the member, never auto-matched. Do not build that speculatively; there is no real Need data yet.

Server Action `backend/actions/needs.ts`: `requireVerified()` → zod validate → insert with
`status: OPEN` and `expiresAt` **set explicitly** (never a schema default, per working
agreements) → enqueue `match-need` → return. **No matching inline.**

---

## 6. The matching engine

This is where accuracy lives. Two stages: a hard filter, then a score.

### Stage 1 — hard filter (SQL)

```sql
SELECT o.id AS offering_id, o."businessId", c.depth AS cat_depth, b.*
FROM   "BusinessOffering" o
JOIN   "Business" b ON b.id = o."businessId"
JOIN   "Category"  c ON c.id = o."categoryId"
WHERE  b.status       = 'APPROVED'
  AND  b."receiveLeads" = true
  AND  o."isActive"   = true
  AND  b."ownerId"   <> :needAuthorId              -- never notify the poster
  AND  c.path LIKE :needCategoryPath || '%'        -- subtree match
  AND  (
        b."districtId" = :needDistrict                                        -- same district: always
     OR (:reachWanted >= 'STATE'    AND b."serviceReach" >= 'STATE'
                                    AND b."stateCode" = :needState)
     OR (:reachWanted >= 'NATIONAL' AND b."serviceReach" >= 'NATIONAL'
                                    AND b.country = :needCountry)
     OR (:reachWanted  = 'INTERNATIONAL' AND b."serviceReach" = 'INTERNATIONAL')
  )
```

Anything failing this filter is never a candidate. No score can rescue it.

### Stage 2 — score (0–100)

| Signal | Points | Rationale |
|---|---|---|
| **Category precision** | | |
| exact category match | **50** | offering is exactly what was asked for |
| offering is one level deeper | 40 | need "Tyres", offering "Truck Tyres" |
| offering two+ levels deeper | 30 | still in the branch, less certain |
| **Geography** | | |
| same district | **30** | local, the trust story |
| same state, reach ≥ STATE | 20 | |
| same country, reach ≥ NATIONAL | 12 | |
| international | 6 | |
| **Keyword overlap** | 0–10 | trigram similarity between (need.quantity + need.notes) and (offering.title + keywords + category.synonyms). **Recall only — cannot substitute for a category match.** |
| **Business quality** | 0–10 | rating_avg×1.5 (max 7) + has photos (2) + owner VERIFIED (1) |
| **Fairness penalty** | −0 to −20 | −4 per lead already sent to this business in the last 7 days |

**Fairness is the quiet workhorse.** Without it the same five well-rated businesses absorb every
lead in a category and everyone else concludes the feature does nothing. The penalty is a
*ranking* adjustment, so a highly relevant lead still reaches a busy business — it just loses to
an equally relevant, less-saturated one.

### Stage 3 — thresholds and caps

```
NOTIFY_SCORE_MIN     = 45     // below this: record the match, notify nobody
MAX_RECIPIENTS       = 15     // top N by score, hardcoded constant
MAX_LEADS_PER_BIZ    = 10     // per rolling 7 days — HARD skip, not a penalty
MAX_NEEDS_PER_MEMBER = 5/day, 20/week
MAX_URGENT_PER_MEMBER= 1/week
MAX_OFFERINGS_PER_BIZ= 20
LEADS_KILL_SWITCH    = env flag, halts ALL dispatch
```

Every one of these lives in `backend/config/guardrails.ts` as a constant — **not a database
setting a user can edit, and not a value derived from input.** Matches below `NOTIFY_SCORE_MIN`
are still written to `NeedMatch` with `digestedAt` left null forever: they cost nothing and they
are your tuning dataset.

---

## 7. Delivery

**Daily digest at 09:00**, same slot as the admin verification digest. **Compose one email per
recipient containing all their sections** — a business owner who is also a district admin gets
one email with both, never two. This is a decision, not an open question.

Digest contents per lead: category, buyer's district, quantity, budget, notes, posted-at. **Never
the buyer's email or phone** — replies route through the existing `backend/messaging/` bounded
context, which already handles blocks and canonical participant ordering.

Two buttons per lead: **"I can help"** (opens a message thread with the buyer) and **"Not
relevant"** (writes `feedback = NOT_RELEVANT`, one click, no login round-trip if you use a signed
token link).

On successful send: set `digestedAt` and `sentAt` on every included row **in one transaction**.
On failure: leave `digestedAt` null so the next run retries. Never mark sent optimistically.

**Urgent path:** bypasses the digest for an immediate single send — still async via the worker,
just a different job. Rate-limited to 1/member/week, or everyone marks everything urgent and
you've built instant-per-match after all.

---

## 8. The feedback loop — how accuracy improves

`NeedMatch.feedback` is what makes this system tunable instead of guesswork.

A weekly job computes precision per category and per offering:

```
precision(offering) = RELEVANT / (RELEVANT + NOT_RELEVANT)
```

- Offering precision **< 40%** over ≥ 10 rated leads → flag it to the owner
  ("Your 'Printing' offering is getting poor matches — try a more specific category")
- Category-level precision consistently low → the taxonomy branch is too coarse; split it
- **Platform-wide dismissal rate > 40% → alert.** That's the product-health alarm already listed
  in the observability section of the architecture docs.

This is the loop that replaces an AI classifier. It uses real member judgment, costs nothing, and
gets better with volume.

---

## 9. Moderation

Needs are member-generated content emailed to other members, and they bypass every approval gate
in the product. That's a deliberate inconsistency: a need is time-sensitive, and a pre-approval
queue would make the feature useless.

Compensating controls instead of a gate:

- District admins get a **read-only view of needs posted in their district** (`/admin/needs`)
- **Report button** on every lead in the digest → flags to the district admin
- Rate limits (§6) bound the damage from any single actor
- Suspending a member (`UserStatus.SUSPENDED`) immediately stops their needs from matching, since
  the hard filter checks owner status

Document this as a conscious decision. If abuse appears in the first waves, the pre-approval gate
is a small addition — the schema already supports it via a `PENDING` need status.

---

## 10. Deliberately NOT copied from IndiaMART

| IndiaMART does | RBW does not | Why |
|---|---|---|
| Pay-per-lead / lead credits | Delivery is included | Members already paid the membership fee. IndiaMART paywalls leads because buyers and sellers are strangers; RBW's verified-Rotarian trust model removes the reason. |
| 100k+ category tree | 3 levels over the existing taxonomy | ~2,000 businesses at launch. A tree bigger than the catalog is dead weight. |
| Instant lead blasts + seller call centre | Daily digest | Flooding is the #1 seller-churn cause and we have no sales team to smooth it over. |
| Open public marketplace | Verified members only, both sides | The entire product thesis. |
| Buyer contact details sold to sellers | Replies via internal messaging | Members would not forgive a leaked phone number. |

---

## 11. Build order

Steps 1–3 are **Tier 1 schema work — do them in the pre-launch migration reset even if the
feature ships later.** Retrofitting a seller catalog and a taxonomy depth change onto live data is
exactly the migration this window exists to avoid.

| # | Step | When |
|---|---|---|
| **1** | `Category.parentId` + `path` + `depth` + `synonyms`; seed a 3-level tree | **Tier 1, week 1** |
| **2** | `Business.districtId`, `stateCode`, `serviceReach`, `receiveLeads` | **Tier 1, week 1** |
| **3** | `BusinessOffering` model + the 20-offering cap | **Tier 1, week 1** |
| **4** | Offerings UI in the business form ("What do you supply?" — multi-select within the branch + keywords) | with listings work |
| **5** | `Need` + `NeedMatch` models, one migration | post-launch |
| **6** | Need posting form + Server Action + zod validator | post-launch |
| **7** | `match-need` worker job — hard filter + scoring + caps | post-launch |
| **8** | `send-need-digest` repeatable job, composed with the admin digest | post-launch |
| **9** | Feedback capture + weekly precision job | post-launch |
| **10** | Lifecycle job (auto-expire), opt-out toggle, `/admin/needs` view | post-launch |
| **11** | Urgent bypass path (additive) | last |

**Steps 5–11 require Tier 2 #9 (Redis + worker) and #10 (Resend) to be live.** Do not build a
synchronous version to "get something working" — it will be thrown away.

Ship steps 5–8 to **one district behind a feature flag**, watch the dismissal rate for two weeks,
then widen. Same wave discipline as the launch itself.

---

## 12. Open decisions

1. **Offering-level vs business-level `serviceReach`.** Spec says business-level for simplicity.
   Per-offering is more accurate (a firm might deliver tyres nationally but service them locally).
   Recommend: business-level now, `BusinessOffering.serviceReach String?` as a nullable override
   added later without a breaking change.
2. **Should a need at a non-leaf category be allowed?** Spec allows it with a nudge. Alternative:
   force leaf selection. Recommend allowing it — forcing leaf selection on a member who doesn't
   know your taxonomy is how intake forms get abandoned.
3. **Digest frequency configurable per business?** (daily / weekly / off) Recommend daily-or-off
   at launch; add weekly if members ask.
4. **Do management accounts see cross-district need volume?** Recommend yes — it's the best
   available signal of whether the directory is producing real business value.
