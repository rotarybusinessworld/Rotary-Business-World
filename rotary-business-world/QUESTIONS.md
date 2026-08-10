# Rotary Business World — Understanding & Open Questions

_Prepared 2026-07-26. Based on reading `CLAUDE.md`, `README.md`, `prisma/schema.prisma`,
`.env.example`, and the `src/` tree._

---

## What this project is (my understanding)

**Rotary Business World** is a worldwide, searchable **business directory for verified
Rotarians**. The core loop:

1. A Rotarian **registers** (email + password).
2. They are **verified** against an official Rotary **roster**:
   - exact Rotary-ID match → `VERIFIED`
   - strong fuzzy name match in the same district → `VERIFIED`
   - otherwise → `PENDING` + a `VerificationRequest` lands in an admin queue
3. Verified members **list their businesses** (with photos, contact info, industry/category,
   location).
4. Any verified member can **search the directory** to find fellow Rotarians by industry,
   name, location, etc.

### Stack
- **Next.js 16** (App Router, Turbopack, TS) + **React 19**, deployed on **Railway**
- **Tailwind v4** — deep navy `#0b1226` + gold `#c9a24c`, Fraunces (headings) / Inter (body)
- **Prisma 6** (pinned) + **PostgreSQL**
- **Auth.js v5** (Credentials + JWT) — access gated via `await auth()` in layouts, **no middleware**
- **Cloudflare R2** for images (falls back to `public/uploads/` in dev)
- **Search**: Postgres `tsvector` + `pg_trgm` trigram, behind a swappable `lib/search` service

### Current status (per CLAUDE.md — reported done & verified)
Scaffold, theme, auth (register/login), roster import + verification, directory search
(FTS + trigram + facets + autocomplete), business CRUD + photo uploads, business/member
detail pages, and the admin verification queue.

**Not yet done:** member connect/follow (Phase 5), listing moderation + taxonomy admin
(Phase 6), SEO/sitemap, and **deploy to Railway** (Phase 7).

---

## Clarifications & doubts I need answered

### A. Scope / priorities
1. **What do you want me to work on right now?** The build looks feature-complete through
   Phase 4. Are you asking me to (a) continue with Phase 5+, (b) fix/verify something
   specific, (c) prepare for the Railway deploy, or (d) just document/review what exists?
2. Of the remaining phases (connect/follow, listing moderation, taxonomy admin, SEO,
   deploy), **which is highest priority?**

### B. Membership & verification
3. Where does the **real global roster** come from, and in what format? The importer expects
   a CSV (`db:import-roster -- roster.csv`) — do you have the actual roster file, and what
   columns does it contain (Rotary ID, name, club, district, email)?
4. What are the exact **fuzzy-match thresholds** you're comfortable with for auto-verifying
   vs. sending to the admin queue? (Current logic: exact ID → verified; strong name match in
   same district → verified.) Too loose risks impersonation; too tight floods the queue.
5. Should **PENDING users** be able to browse the directory (current behavior) or be fully
   locked out until verified?
6. Is **email verification** required before a user can do anything? The schema has
   `EmailVerificationToken` and `emailVerifiedAt`, but I want to confirm it's actually
   enforced in the flow (SMTP is optional in dev — links log to console).

### C. Roles & admin
7. Roles are `MEMBER`, `CLUB_ADMIN`, `SUPER_ADMIN`. **What can a `CLUB_ADMIN` do** that a
   member can't? The admin queue appears role-gated but I want to confirm the intended
   permission boundaries (e.g., can club admins only verify members in their own district/club?).
8. How is the **first admin** created in production? (`make-admin` script exists for local —
   is that the intended prod path too?)

### D. Business listings
9. **How many businesses can one member list?** (Schema allows many.) Any limit?
10. Should new businesses be **`ACTIVE` immediately** (current default) or go through
    moderation/approval first? This ties into Phase 6 "listing moderation."
11. Are **`lat`/`lng`** meant to power a map/geo-search, or just stored for now? No geocoding
    is wired up that I can see.

### E. Search
12. Is **Postgres FTS good enough for launch**, or do you already plan to move to Typesense?
    The interface is swappable, so this is a "when," not "if."
13. What are the **primary search facets** members will use most (industry, country, city)?
    Want to confirm the facet sidebar matches real usage.

### F. Infrastructure & deploy
14. Is the **Railway project already provisioned** (Postgres plugin, env vars), or does that
    still need to be set up?
15. Is the **Cloudflare R2 bucket** (`rotary-business-world`) created, and do you have the
    credentials? Images fall back to local disk without it — fine for dev, not for prod.
16. Is **transactional email (SMTP)** set up anywhere, or still console-only? Verification
    links won't reach real users without it.

### G. Product / non-technical
17. **Languages/i18n** — the memory notes "English-first, i18n-ready." Do you need additional
    languages at launch, or is English sufficient for v1?
18. Is there a **target launch date** or a specific milestone driving this work?
19. Any **legal/privacy** requirements (GDPR, member data consent) I should account for given
    this stores personal contact data for Rotarians worldwide?

---

## Things I'm fairly confident about (flag if I'm wrong)
- The app is **not yet deployed** — no Railway config beyond `.env.example` placeholders.
- The **search vector is a trigger-maintained plain `tsvector`** (not a generated column) to
  avoid Prisma migration churn — this is deliberate.
- **R2 and SMTP are optional in dev** and fall back to local disk / console logging.
- Git has **one commit** ("Initial commit from Create Next App") with a large amount of
  uncommitted work in the tree — so most of the real project is **not yet committed**.
