# Deployment (Railway)

The whole app (frontend + backend) deploys as **one Next.js service**. Postgres runs
as a second service in the **same Railway project and region**. S3 (email via
Hostinger) stay external. See `ARCHITECTURE.md` for why it's a single app.

> **Region:** put the app and Postgres in the region closest to your users. S3 is in
> `ap-south-1` (Mumbai), so pick the nearest Railway region and keep app↔DB together —
> the app↔DB round-trips dominate latency, not app↔S3.

---

## 1. Create the project + database

1. Create a new Railway project.
2. **Add Postgres:** `New → Database → PostgreSQL`. Railway exposes it as
   `${{Postgres.DATABASE_URL}}` for other services to reference.
3. **Add the app:** `New → GitHub Repo` → select this repo. Set the **Root Directory**
   to `rotary-business-world` (the app is in a subfolder).

## 2. Build & start commands

Prisma Client must be generated at build, and migrations applied before the app boots.
Set these in the app service → **Settings**:

- **Build Command:**
  ```
  npm run prisma:generate && npm run build
  ```
- **Pre-Deploy Command** (runs once per deploy, before the new version goes live —
  this is where migrations belong, *not* the build):
  ```
  npm run db:deploy
  ```
  `db:deploy` runs `prisma migrate deploy` (applies committed migrations; never
  generates new ones in prod).
- **Start Command:**
  ```
  npm run start
  ```
  `next start` binds to the `PORT` Railway injects automatically.

> **One-time DB setup** (search SQL + seed): the repo also has
> `npm run db:setup` (= `migrate deploy` + `db:search` + `db:seed`). Run the search/seed
> parts **once** from a local shell pointed at the prod `DATABASE_URL`, or via Railway's
> shell — see step 5. Keep the recurring Pre-Deploy Command as just `db:deploy` unless
> `db:search` is written idempotently (`CREATE ... IF NOT EXISTS`).

## 3. Environment variables

Set these on the **app service** (Railway → Variables). Values mirror `.env.example`.

| Variable | Value / source |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference, not a literal) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | your public URL, e.g. `https://app.yourdomain.com` (set after step 4) |
| `AWS_REGION` | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user with S3 access |
| `S3_BUCKET` | `rotary-business-world` |
| `NEXT_PUBLIC_S3_PUBLIC_HOSTNAME` | bucket/CDN host, no protocol |
| `STRIPE_SECRET_KEY` | live key `sk_live_...` (prod refuses demo mode) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 6 |
| `EMAIL_FROM` | `Rotary Business World <no-reply@yourdomain.com>` |
| `SMTP_URL` | Hostinger SMTP (email only; not app hosting) |

> Never prefix a secret with `NEXT_PUBLIC_` — that inlines it into the browser bundle.
> Only `NEXT_PUBLIC_S3_PUBLIC_HOSTNAME` is intentionally public.

## 4. Domain

1. App service → **Settings → Networking → Generate Domain** (or add a custom domain
   and point DNS at Railway).
2. Set `AUTH_URL` to that final URL and redeploy. Auth.js callbacks break if `AUTH_URL`
   doesn't match the real origin.

## 5. First-run: search index, seed, admin

From a shell with `DATABASE_URL` set to the **prod** database (local terminal or
Railway service shell):

```bash
npm run db:search      # installs full-text search SQL
npm run db:seed        # optional starter data
npm run make-admin     # promote your account to admin (follow its prompt)
```

## 6. Stripe webhook (source of truth for paid status)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<your-domain>/api/stripe/webhook`.
3. Subscribe to the checkout/payment events the app handles (e.g.
   `checkout.session.completed`).
4. Copy the signing secret (`whsec_...`) → set `STRIPE_WEBHOOK_SECRET` → redeploy.

Without this, payments succeed at Stripe but membership never activates.

## 7. Deploy checklist

- [ ] Postgres + app in the same project & region
- [ ] Root Directory = `rotary-business-world`
- [ ] Build / Pre-Deploy / Start commands set
- [ ] All env vars present (`STRIPE_SECRET_KEY` is live, not demo)
- [ ] Domain generated and `AUTH_URL` matches it
- [ ] `db:search` run once; admin user promoted
- [ ] Stripe webhook created and `STRIPE_WEBHOOK_SECRET` set

## Ongoing deploys

Push to the deployment branch → Railway rebuilds → **Pre-Deploy** runs
`prisma migrate deploy` → new version goes live. Commit new migrations with the code
that needs them; never run `prisma migrate dev` against production.
