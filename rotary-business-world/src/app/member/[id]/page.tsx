import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/frontend/site-header";
import { BusinessCard } from "@/frontend/search/business-card";
import { Badge } from "@/frontend/ui/badge";
import { buttonVariants } from "@/frontend/ui/button";
import { requirePaid } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import type { BusinessHit } from "@/backend/search/types";
import {
  AtSign,
  BadgeCheck,
  Briefcase,
  Building2,
  Globe,
  Globe2,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

async function getMember(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      rotaryInfo: { include: { club: true, district: true } },
      businesses: { where: { status: "ACTIVE" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const member = await getMember(id);
  return { title: member?.profile?.fullName ?? "Member" };
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePaid(`/member/${id}`);

  const member = await getMember(id);
  if (!member) notFound();

  const verified = member.status === "VERIFIED";
  const club = member.rotaryInfo?.club?.name;
  const district =
    member.rotaryInfo?.district?.code ?? member.rotaryInfo?.district?.name;
  const profileLocation = [member.profile?.city, member.profile?.country]
    .filter(Boolean)
    .join(", ");

  const contactLinks = [
    member.profile?.website && {
      icon: Globe,
      label: "Website",
      href: member.profile.website,
    },
    member.profile?.linkedin && {
      icon: Briefcase,
      label: "LinkedIn",
      href: member.profile.linkedin,
    },
    member.profile?.instagram && {
      icon: AtSign,
      label: "Instagram",
      href: member.profile.instagram.startsWith("http")
        ? member.profile.instagram
        : `https://instagram.com/${member.profile.instagram.replace(/^@/, "")}`,
    },
    member.profile?.phone && {
      icon: Phone,
      label: "Call",
      href: `tel:${member.profile.phone}`,
    },
    member.profile?.whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      href: `https://wa.me/${member.profile.whatsapp.replace(/[^0-9]/g, "")}`,
    },
  ].filter(Boolean) as { icon: typeof Globe; label: string; href: string }[];

  const hits: BusinessHit[] = member.businesses.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    city: b.city,
    country: b.country,
    industryName: b.industryName,
    categoryName: b.categoryName,
    ownerVerified: verified,
  }));

  const fullName = member.profile?.fullName ?? "Rotarian";
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">

        {/* ── Hero member card ─────────────────────────────────── */}
        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]">

          {/* Navy top band — same visual language as business page cover */}
          <div className="relative h-24 sm:h-28 bg-navy-800">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 80% at 30% 50%, rgba(201,162,76,0.18), transparent 70%)",
              }}
            />
          </div>

          {/* Avatar + identity */}
          <div className="px-4 pb-6 sm:px-6">
            {/* Circular avatar overlapping the band */}
            <div className="relative z-10 -mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card ring-4 ring-card shadow-[var(--shadow-card)]">
              {member.profile?.photoUrl ? (
                <Image
                  src={member.profile.photoUrl}
                  alt={fullName}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-muted-foreground/60">
                  {initial}
                </span>
              )}
            </div>

            {/* Name + verified check */}
            <div className="mt-3 flex items-center gap-2.5">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
                {fullName}
              </h1>
              {verified && (
                <BadgeCheck
                  className="h-6 w-6 shrink-0 text-success"
                  aria-label="Verified Rotarian"
                />
              )}
            </div>

            {/* Meta chips: badge · club · district · classification · member since */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {verified && <Badge variant="verified">Verified Rotarian</Badge>}
              {club && (
                <span className="text-sm text-muted-foreground">{club}</span>
              )}
              {district && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Globe2 className="h-3.5 w-3.5 shrink-0" />
                  District {district}
                </span>
              )}
              {member.rotaryInfo?.classification && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  {member.rotaryInfo.classification}
                </span>
              )}
              {member.rotaryInfo?.memberSince && (
                <span className="text-sm text-muted-foreground">
                  Member since {member.rotaryInfo.memberSince}
                </span>
              )}
            </div>

            {/* Bio */}
            {member.profile?.bio && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {member.profile.bio}
              </p>
            )}

            {/* Contact pills + location chip */}
            {(contactLinks.length > 0 || profileLocation) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {contactLinks.map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <c.icon className="h-4 w-4" />
                    {c.label}
                  </a>
                ))}
                {profileLocation && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {profileLocation}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Businesses section ───────────────────────────────── */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Businesses
            </h2>
            {hits.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {hits.length}{" "}
                {hits.length === 1 ? "listing" : "listings"}
              </span>
            )}
          </div>

          {hits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-card py-10 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No businesses listed yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {hits.map((hit) => (
                <BusinessCard key={hit.id} hit={hit} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
