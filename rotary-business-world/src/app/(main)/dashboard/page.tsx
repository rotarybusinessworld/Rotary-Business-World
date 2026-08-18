import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toImageSrc } from "@/shared/image";
import { requirePaid } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import { Badge } from "@/frontend/ui/badge";
import { buttonVariants } from "@/frontend/ui/button";
import {
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Eye,
  Globe2,
  MapPin,
  PackageSearch,
  Plus,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { Business } from "@prisma/client";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const sessionUser = await requirePaid();
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: { profile: true, businesses: true },
  });
  if (!user) redirect("/login");

  const verified = user.status === "VERIFIED";
  const displayName = user.profile?.fullName ?? user.email;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Dashboard
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
              {displayName}
            </h1>
            <div className="mt-2">
              {verified ? (
                <Badge variant="verified">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified Rotarian
                </Badge>
              ) : (
                <Badge variant="gold">
                  <Clock className="h-3.5 w-3.5" /> Verification pending
                </Badge>
              )}
            </div>
          </div>

          {verified && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/needs"
                className={buttonVariants({ variant: "outline" })}
              >
                <PackageSearch className="h-4 w-4" /> Post a need
              </Link>
              <Link
                href="/dashboard/profile"
                className={buttonVariants({ variant: "outline" })}
              >
                <Settings className="h-4 w-4" /> Edit profile
              </Link>
              <Link
                href="/dashboard/businesses/new"
                className={buttonVariants({ variant: "primary" })}
              >
                <Plus className="h-4 w-4" /> Add business
              </Link>
            </div>
          )}
        </div>

        {/* ── Verification pending — full hero ─────────────────────── */}
        {!verified && (
          <div className="mb-8">
            {/* Hero card */}
            <div className="relative overflow-hidden rounded-2xl bg-navy text-white shadow-[var(--shadow-pop)]">
              {/* Ambient glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(65% 55% at 50% -5%, rgba(201,162,76,0.22), transparent 70%)",
                }}
              />
              {/* Gold hairline */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rotary-gold/60 to-transparent"
              />

              <div className="relative px-6 py-8 sm:px-10 sm:py-10">
                {/* Icon chip */}
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rotary-gold/30 bg-rotary-gold/10">
                  <ShieldCheck className="h-7 w-7 text-rotary-gold-light" />
                </div>

                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rotary-gold-light">
                  Step 3 of 3 · Identity verification
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight sm:text-3xl">
                  Verifying your Rotary identity
                </h2>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/70">
                  Your payment is confirmed. A district administrator is now reviewing your
                  membership against the official Rotary roster. You&rsquo;ll receive full
                  access — listings, messaging, and reviews — as soon as you&rsquo;re approved.
                </p>

                {/* Step indicator (mirrors onboarding/payment page) */}
                <ol className="mt-6 flex flex-wrap items-center gap-2.5 text-[12px] font-medium">
                  <li className="flex items-center gap-1.5 text-white/50">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                      <Check className="h-3 w-3" />
                    </span>
                    Account created
                  </li>
                  <span className="h-px w-5 bg-white/15" aria-hidden />
                  <li className="flex items-center gap-1.5 text-white/50">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                      <Check className="h-3 w-3" />
                    </span>
                    Payment received
                  </li>
                  <span className="h-px w-5 bg-white/15" aria-hidden />
                  <li className="flex items-center gap-1.5 text-rotary-gold-light">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-rotary-gold/50 bg-rotary-gold/15">
                      <Clock className="h-3 w-3" />
                    </span>
                    Identity verification
                  </li>
                </ol>

                {/* What you can do now */}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/directory"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    <Globe2 className="h-4 w-4" />
                    Browse the directory
                  </Link>
                  <p className="text-[12px] text-white/40">
                    You can explore the network while we review your account.
                  </p>
                </div>
              </div>
            </div>

            {/* What unlocks on approval */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: Building2, label: "List your businesses" },
                { icon: BadgeCheck, label: "Leave reviews" },
                { icon: Globe2, label: "Message members" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-4 text-center shadow-[var(--shadow-card)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <Badge variant="gold" size="sm">
                    <Clock className="h-2.5 w-2.5" /> Unlocks on approval
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── My businesses (verified members only) ────────────────── */}
        {verified && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                My businesses
              </h2>
              {user.businesses.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {user.businesses.length}{" "}
                  {user.businesses.length === 1 ? "listing" : "listings"}
                </span>
              )}
            </div>

            {user.businesses.length === 0 ? (
              /* Empty state */
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">
                  No businesses yet
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Add your first business to get discovered by Rotarians worldwide.
                </p>
                <Link
                  href="/dashboard/businesses/new"
                  className={`${buttonVariants({ variant: "primary", size: "md" })} mt-5`}
                >
                  <Plus className="h-4 w-4" /> Add your first business
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {user.businesses.map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
                {/* Add-another CTA tile */}
                <Link
                  href="/dashboard/businesses/new"
                  className="group flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border bg-card text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-muted/50 hover:text-primary"
                >
                  <Plus className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
                  <span className="text-sm font-medium">Add another business</span>
                </Link>
              </div>
            )}
          </section>
        )}
    </main>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return <Badge variant="verified" size="sm"><BadgeCheck className="h-3 w-3" /> Live</Badge>;
    case "PENDING":
      return <Badge variant="gold" size="sm"><Clock className="h-3 w-3" /> Pending review</Badge>;
    case "DRAFT":
      return <Badge variant="muted" size="sm">Draft</Badge>;
    case "REJECTED":
      return <Badge variant="destructive" size="sm">Rejected</Badge>;
    case "SUSPENDED":
      return <Badge variant="default" size="sm">Suspended</Badge>;
    default:
      return <Badge variant="muted" size="sm">{status}</Badge>;
  }
}

function BusinessCard({ business }: { business: Business }) {
  const location = [business.city, business.country].filter(Boolean).join(", ");
  const isPending = business.status === "PENDING";
  const isDraft = business.status === "DRAFT";
  const isRejected = business.status === "REJECTED";

  return (
    <div className="group flex flex-col gap-0 overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[var(--shadow-pop)]">
      {/* Card body */}
      <div className="flex flex-1 gap-4 p-4 sm:p-5">
        {/* Logo */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted">
          {business.logoKey ? (
            <Image
              src={toImageSrc(business.logoKey)!}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-[family-name:var(--font-display)] font-semibold leading-snug text-foreground">
              {business.name}
            </h3>
            {statusBadge(business.status)}
          </div>

          {business.industryName && (
            <p className="mt-1 text-xs text-muted-foreground">
              {business.industryName}
              {business.categoryName ? ` · ${business.categoryName}` : ""}
            </p>
          )}

          {location && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </p>
          )}

          {/* Contextual hint for non-live states */}
          {isPending && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Your listing is awaiting approval from your district admin. It&rsquo;s not yet
              visible in the directory.
            </p>
          )}
          {isDraft && (
            <p className="mt-2 text-[11px] text-amber-600">
              Your listing is a draft. Submit it to enter the review queue.
            </p>
          )}
          {isRejected && (
            <p className="mt-2 text-[11px] text-destructive">
              Your listing was rejected. Edit it and resubmit to re-enter the review queue.
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
        {business.status === "APPROVED" && (
          <Link
            href={`/business/${business.slug}`}
            className={`${buttonVariants({ variant: "outline", size: "sm" })} flex-1 justify-center`}
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Link>
        )}
        <Link
          href={`/dashboard/businesses/${business.id}`}
          className={`${buttonVariants({ variant: "primary", size: "sm" })} flex-1 justify-center`}
        >
          <Settings className="h-3.5 w-3.5" /> Manage
        </Link>
      </div>
    </div>
  );
}
