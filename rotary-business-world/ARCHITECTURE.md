# Architecture

Rotary Business World is a **Next.js full-stack monolith** — one deployable app that
serves both the UI and the server logic. This is deliberate. See "Scaling" for why we
have *not* split into separate frontend/backend services, and when we would.

## Layers

The code is separated **logically**, not into separate services. The dependency
direction is one-way and must stay that way:

```
frontend  →  backend/actions  →  backend/services  →  database (Prisma)
   UI          entry points        domain logic         Postgres
```

```
src/
  app/         Next.js routes, pages, API route handlers (the framework shell)
  frontend/    UI components only — presentation, no data access
  backend/
    actions/     Server Actions — the ONLY entry point the frontend may call
    services/    Domain logic — pure, no React, no next/* imports
    storage/     File storage abstraction (local.ts / s3.ts behind index.ts)
    search/      Directory search/filtering logic
  shared/
    types/       Types shared across the boundary (source of type safety)
```

## The rules (the seam)

These are what let the monolith scale and, if ever needed, split cleanly later.

1. **`frontend/` never imports from `backend/services`, Prisma, Stripe, or S3
   directly.** It goes through `backend/actions` only. That is the seam.
2. **`backend/services` stays pure** — no React, no `next/*` imports. It should read
   like a standalone package so any one service can be extracted without a rewrite.
3. **All secrets and data access live in `backend/`.** Never prefix a secret with
   `NEXT_PUBLIC_` (that inlines it into the browser bundle).
4. **Types cross the boundary through `shared/types`**, not by reaching across layers.

## External dependencies

| Concern        | Provider              | Notes                                              |
|----------------|-----------------------|----------------------------------------------------|
| Database       | PostgreSQL            | via Prisma (`DATABASE_URL`)                         |
| Auth           | Auth.js (next-auth)   | Prisma adapter                                      |
| Payments       | Stripe Checkout       | Webhook at `/api/stripe/webhook` is source of truth for paid status |
| File storage   | AWS S3 (`ap-south-1`) | Public read via bucket policy / CDN, not ACLs      |
| Email (future) | Hostinger SMTP        | Not yet implemented                                 |

## Scaling: extract the noisy component, don't split "the backend"

This monolith scales to a serious business (tens of thousands of businesses/members,
real traffic) **without restructuring**. When pressure appears, it will be in a
specific component — fix *that*, additively. Do **not** split the app into a separate
frontend service + backend service; that adds cost (two deploys, CORS, token passing,
network latency, lost end-to-end type safety) and solves none of the problems below.

| Pressure point                      | Shows up when                        | Fix (additive)                                   |
|-------------------------------------|--------------------------------------|--------------------------------------------------|
| **Database**                        | Almost always first                  | Indexes, connection pooling (PgBouncer), read replicas |
| **Search** (`backend/search`)       | Filtering slow on many businesses    | Postgres FTS, or extract to Meilisearch/Typesense/Algolia |
| **Heavy async** (image/video, bulk CSV import, email) | A request must do slow work | Queue + background worker — not a second web server |
| **Cold/slow pages**                 | Traffic spikes                       | Caching, CDN, `revalidate`                        |

When would we *actually* split a service out? Only when one piece needs **independent
scaling** (e.g. a media-processing worker), an **external client** needs the API (e.g.
a native mobile app — add `app/api/*` route handlers), or a **different team/language**
owns it. Even then: extract *that one thing*, keep the rest a monolith.
