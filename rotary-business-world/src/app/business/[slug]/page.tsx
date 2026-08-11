import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/frontend/site-header";
import { BusinessCard } from "@/frontend/search/business-card";
import { BusinessGallery } from "@/frontend/business/business-gallery";
import { Badge } from "@/frontend/ui/badge";
import { Card, CardContent } from "@/frontend/ui/card";
import { buttonVariants } from "@/frontend/ui/button";
import { requirePaid } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import type { BusinessHit } from "@/backend/search/types";
import {
  AtSign,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronRight,
  Globe,
  Images,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Percent,
  Phone,
} from "lucide-react";

async function getBusiness(slug: string) {
  return db.business.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: {
        include: {
          profile: true,
          rotaryInfo: { include: { club: true, district: true } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return { title: "Business not found" };
  return {
    title: business.name,
    description:
      business.description ?? `${business.name} on Rotary Business World`,
  };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await requirePaid(`/business/${slug}`);

  const business = await getBusiness(slug);
  if (!business || business.status !== "ACTIVE") notFound();

  const isOwner = viewer.id === business.ownerId;
  const ownerVerified = business.owner.status === "VERIFIED";
  const location = [business.city, business.country].filter(Boolean).join(", ");
  const address = [business.addressLine, business.city, business.country]
    .filter(Boolean)
    .join(", ");

  // Similar businesses
  const similar = business.industryId
    ? await db.business.findMany({
        where: {
          status: "ACTIVE",
          industryId: business.industryId,
          id: { not: business.id },
        },
        include: { owner: { select: { status: true } } },
        take: 4,
      })
    : [];

  const similarHits: BusinessHit[] = similar.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    city: b.city,
    country: b.country,
    industryName: b.industryName,
    categoryName: b.categoryName,
    ownerVerified: b.owner.status === "VERIFIED",
  }));

  // Contact pills for the action bar
  const contacts = [
    business.website && { icon: Globe, label: "Website", href: business.website },
    business.phone && {
      icon: Phone,
      label: "Call",
      href: `tel:${business.phone}`,
    },
    business.whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      href: `https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`,
    },
    business.email && {
      icon: Mail,
      label: "Email",
      href: `mailto:${business.email}`,
    },
    business.linkedin && {
      icon: Briefcase,
      label: "LinkedIn",
      href: business.linkedin,
    },
    business.instagram && {
      icon: AtSign,
      label: "Instagram",
      href: business.instagram.startsWith("http")
        ? business.instagram
        : `https://instagram.com/${business.instagram.replace(/^@/, "")}`,
    },
  ].filter(Boolean) as { icon: typeof Globe; label: string; href: string }[];

  // Sidebar contact rows (includes address)
  const sidebarContacts = [
    business.website && {
      icon: Globe,
      label: business.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      href: business.website,
    },
    business.phone && {
      icon: Phone,
      label: business.phone,
      href: `tel:${business.phone}`,
    },
    business.whatsapp && {
      icon: MessageCircle,
      label: business.whatsapp,
      href: `https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`,
    },
    business.email && {
      icon: Mail,
      label: business.email,
      href: `mailto:${business.email}`,
    },
    business.linkedin && {
      icon: Briefcase,
      label: "LinkedIn profile",
      href: business.linkedin,
    },
    business.instagram && {
      icon: AtSign,
      label: business.instagram.replace(/^@/, "@"),
      href: business.instagram.startsWith("http")
        ? business.instagram
        : `https://instagram.com/${business.instagram.replace(/^@/, "")}`,
    },
    address && { icon: MapPin, label: address, href: null },
  ].filter(Boolean) as {
    icon: typeof Globe;
    label: string;
    href: string | null;
  }[];

  const hasPhotos = !!(business.coverUrl || business.logoUrl || business.images.length);

  const ownerName = business.owner.profile?.fullName ?? "Rotarian";
  const ownerInitial = ownerName.charAt(0).toUpperCase();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        {/* ── Breadcrumb ─────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/directory" className="transition-colors hover:text-foreground">
            Directory
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium text-foreground">
            {business.name}
          </span>
        </nav>

        {/* ── Hero card ─────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]">
          {/* Cover band */}
          <div className="relative h-40 sm:h-52 lg:h-60 bg-navy-800">
            {business.coverUrl ? (
              <>
                <Image
                  src={business.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 960px, 100vw"
                  priority
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
                />
              </>
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background:
                    "linear-gradient(135deg, #0b1226 0%, #1a2445 50%, #26325a 100%)",
                }}
              >
                <div
                  aria-hidden
                  className="h-full w-full"
                  style={{
                    background:
                      "radial-gradient(60% 60% at 70% 40%, rgba(201,162,76,0.12), transparent 70%)",
                  }}
                />
              </div>
            )}

            {/* Edit button — glass pill, top-right of cover */}
            {isOwner && (
              <Link
                href={`/dashboard/businesses/${business.id}`}
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Pencil className="h-3 w-3" />
                Edit listing
              </Link>
            )}
          </div>

          {/* Info block */}
          <div className="px-4 pb-5 pt-0 sm:px-6">
            {/* Logo — half-overlaps the cover; solid bg-card ring so it reads
                cleanly against the dark navy cover above */}
            <div className="relative z-10 -mt-12 mb-3 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-card ring-4 ring-card shadow-[var(--shadow-card)]">
              {business.logoUrl ? (
                <Image
                  src={business.logoUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground/50" />
              )}
            </div>

            {/* Name + verified */}
            <div className="mt-3 flex items-center gap-2.5">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
                {business.name}
              </h1>
              {ownerVerified && (
                <BadgeCheck
                  className="h-6 w-6 shrink-0 text-success"
                  aria-label="Verified Rotarian owner"
                />
              )}
            </div>

            {/* Industry · Category · Location */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {business.industryName && (
                <Badge variant="default">{business.industryName}</Badge>
              )}
              {business.categoryName && (
                <span>{business.categoryName}</span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {location}
                </span>
              )}
            </div>

            {/* Rotarian discount badge */}
            {!!business.discountPercent && (
              <div className="mt-3 flex w-fit items-center gap-2 rounded-full border border-rotary-gold/30 bg-[color-mix(in_srgb,var(--color-rotary-gold)_8%,white)] px-3.5 py-1.5">
                <Percent className="h-3.5 w-3.5 shrink-0 text-rotary-gold-dark" />
                <span className="text-sm font-semibold text-rotary-gold-dark">
                  {business.discountPercent}% OFF for Rotarians
                </span>
                {business.discountNote && (
                  <span className="text-sm text-muted-foreground">
                    · {business.discountNote}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Contact action bar ─────────────────────────────────── */}
        {contacts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {contacts.map((c, i) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  i === 0
                    ? buttonVariants({ variant: "gold", size: "sm" })
                    : buttonVariants({ variant: "outline", size: "sm" })
                }
              >
                <c.icon className="h-4 w-4" />
                {c.label}
              </a>
            ))}
          </div>
        )}

        {/* ── Owner "add photos" nudge (first-time owner prompt) ── */}
        {isOwner && !hasPhotos && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[var(--radius)] border border-dashed border-rotary-gold/40 bg-[color-mix(in_srgb,var(--color-rotary-gold)_6%,white)] px-4 py-3">
            <div className="flex items-center gap-3">
              <Images className="h-5 w-5 shrink-0 text-rotary-gold-dark" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Make your profile shine —
                </span>{" "}
                add a logo, cover, and gallery.
              </p>
            </div>
            <Link
              href={`/dashboard/businesses/${business.id}`}
              className="shrink-0 text-sm font-medium text-rotary-gold-dark hover:underline"
            >
              Add photos →
            </Link>
          </div>
        )}

        {/* ── Main content grid ──────────────────────────────────── */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">

          {/* ── LEFT: About + Gallery ─────────────────────────── */}
          <div className="space-y-6">
            {/* About */}
            {business.description && (
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <h2 className="mb-3 font-[family-name:var(--font-display)] text-base font-semibold">
                    About
                  </h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {business.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {business.images.length > 0 && (
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <h2 className="mb-4 font-[family-name:var(--font-display)] text-base font-semibold">
                    Gallery
                  </h2>
                  <BusinessGallery
                    images={business.images.map((img) => ({
                      id: img.id,
                      url: img.url,
                    }))}
                  />
                </CardContent>
              </Card>
            )}

            {/* Empty state for non-owner visitors with no content */}
            {!business.description && business.images.length === 0 && (
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <p className="text-sm text-muted-foreground">
                    No additional information has been added yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT: Sidebar ────────────────────────────────── */}
          <aside className="space-y-4">
            {/* Rotarian discount card */}
            {!!business.discountPercent && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-navy-800 px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rotary-gold/70">
                      Rotarian offer
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-rotary-gold">
                        {business.discountPercent}%
                      </span>
                      <span className="text-lg font-semibold text-white/80">OFF</span>
                    </div>
                    {business.discountNote && (
                      <p className="mt-1 text-sm text-white/60">{business.discountNote}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Get in touch card */}
            {sidebarContacts.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="mb-4 font-[family-name:var(--font-display)] text-base font-semibold">
                    Get in touch
                  </h3>
                  <ul className="space-y-3">
                    {sidebarContacts.map((c) => (
                      <li key={c.label} className="flex items-start gap-3">
                        <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        {c.href ? (
                          <a
                            href={c.href}
                            target={c.href.startsWith("http") ? "_blank" : undefined}
                            rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="truncate text-sm text-foreground transition-colors hover:text-primary"
                          >
                            {c.label}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {c.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Rotarian owner card */}
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Rotarian owner
                </p>
                <Link
                  href={`/member/${business.ownerId}`}
                  className="group flex items-center gap-3 transition-opacity hover:opacity-90"
                >
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {business.owner.profile?.photoUrl ? (
                      <Image
                        src={business.owner.profile.photoUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-semibold text-muted-foreground">
                        {ownerInitial}
                      </span>
                    )}
                  </div>

                  {/* Name + club */}
                  <div className="min-w-0">
                    <p className="truncate font-medium transition-colors group-hover:text-primary">
                      {ownerName}
                    </p>
                    {business.owner.rotaryInfo?.club && (
                      <p className="truncate text-xs text-muted-foreground">
                        {business.owner.rotaryInfo.club.name}
                      </p>
                    )}
                    {business.owner.rotaryInfo?.district && (
                      <p className="truncate text-xs text-muted-foreground">
                        District {business.owner.rotaryInfo.district.code}
                      </p>
                    )}
                  </div>
                </Link>

                <Link
                  href={`/member/${business.ownerId}`}
                  className="mt-4 block text-xs font-medium text-primary hover:underline"
                >
                  View profile →
                </Link>
              </CardContent>
            </Card>

            {/* Verified trust note */}
            {ownerVerified && (
              <div className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-[color-mix(in_srgb,var(--color-success)_6%,white)] px-4 py-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The owner is verified against the official{" "}
                  <span className="font-medium text-foreground">Rotary roster</span>.
                </p>
              </div>
            )}
          </aside>
        </div>

        {/* ── Similar businesses ─────────────────────────────────── */}
        {similarHits.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Similar Rotarian businesses
              </h2>
              {business.industryName && (
                <Link
                  href={`/directory?industry=${encodeURIComponent(business.industryName)}`}
                  className="text-sm text-primary hover:underline"
                >
                  View all →
                </Link>
              )}
            </div>
            <div className="grid gap-3">
              {similarHits.map((hit) => (
                <BusinessCard key={hit.id} hit={hit} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
