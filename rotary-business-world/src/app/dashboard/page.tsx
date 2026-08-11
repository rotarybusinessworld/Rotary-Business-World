import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/frontend/site-header";
import { requirePaid } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import { Badge } from "@/frontend/ui/badge";
import { buttonVariants } from "@/frontend/ui/button";
import {
  BadgeCheck,
  Building2,
  Clock,
  Eye,
  MapPin,
  Plus,
  Settings,
} from "lucide-react";
import type { Business } from "@prisma/client";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const sessionUser = await requirePaid();
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: { profile: true, businesses: true },
  });
  if (!user) return null;

  const verified = user.status === "VERIFIED";
  const displayName = user.profile?.fullName ?? user.email;

  return (
    <>
      <SiteHeader />

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
            <div className="flex items-center gap-2">
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

        {/* ── Verification pending banner ──────────────────────────── */}
        {!verified && (
          <div className="relative mb-6 overflow-hidden rounded-[var(--radius)] bg-navy px-5 py-5 text-white shadow-[var(--shadow-card)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 80% at 50% 0%, rgba(201,162,76,0.18), transparent 70%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rotary-gold/30 bg-rotary-gold/10">
                <Clock className="h-5 w-5 text-rotary-gold-light" />
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] font-semibold">
                  Membership under review
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  We could not automatically match your details to the Rotary
                  roster, so a district administrator will review your account.
                  You can browse the directory in the meantime — listing tools
                  unlock once verified.
                </p>
                <Link
                  href="/directory"
                  className="mt-3 inline-flex text-sm font-medium text-rotary-gold-light hover:underline"
                >
                  Browse the directory →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── My businesses ────────────────────────────────────────── */}
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
                {verified
                  ? "Add your first business to get discovered by Rotarians worldwide."
                  : "Once verified, you'll be able to list your business here."}
              </p>
              {verified && (
                <Link
                  href="/dashboard/businesses/new"
                  className={`${buttonVariants({ variant: "primary", size: "md" })} mt-5`}
                >
                  <Plus className="h-4 w-4" /> Add your first business
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {user.businesses.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}

              {/* Add-another CTA tile */}
              {verified && (
                <Link
                  href="/dashboard/businesses/new"
                  className="group flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border bg-card text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-muted/50 hover:text-primary"
                >
                  <Plus className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
                  <span className="text-sm font-medium">Add another business</span>
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function BusinessCard({ business }: { business: Business }) {
  const location = [business.city, business.country].filter(Boolean).join(", ");
  const isActive = business.status === "ACTIVE";

  return (
    <div className="group flex flex-col gap-0 overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[var(--shadow-pop)]">
      {/* Card body */}
      <div className="flex flex-1 gap-4 p-4 sm:p-5">
        {/* Logo */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted">
          {business.logoUrl ? (
            <Image
              src={business.logoUrl}
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
            <Badge
              variant={isActive ? "verified" : "gold"}
              size="sm"
              className="shrink-0"
            >
              {isActive ? "Active" : "Pending"}
            </Badge>
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
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
        <Link
          href={`/business/${business.slug}`}
          className={`${buttonVariants({ variant: "outline", size: "sm" })} flex-1 justify-center`}
        >
          <Eye className="h-3.5 w-3.5" /> View
        </Link>
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
