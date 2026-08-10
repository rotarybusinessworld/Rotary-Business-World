import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/frontend/site-header";
import { BusinessCard } from "@/frontend/search/business-card";
import { Badge } from "@/frontend/ui/badge";
import { Card, CardContent } from "@/frontend/ui/card";
import { buttonVariants } from "@/frontend/ui/button";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";
import type { BusinessHit } from "@/backend/search/types";
import {
  AtSign,
  BadgeCheck,
  Briefcase,
  Building2,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
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
    description: business.description ?? `${business.name} on Rotary Business World`,
  };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business || business.status !== "ACTIVE") notFound();

  const session = await auth();
  const isOwner = session?.user?.id === business.ownerId;
  const ownerVerified = business.owner.status === "VERIFIED";
  const location = [business.city, business.country].filter(Boolean).join(", ");

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

  const contacts = [
    business.website && { icon: Globe, label: "Website", href: business.website },
    business.phone && { icon: Phone, label: "Call", href: `tel:${business.phone}` },
    business.whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      href: `https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`,
    },
    business.email && { icon: Mail, label: "Email", href: `mailto:${business.email}` },
    business.linkedin && { icon: Briefcase, label: "LinkedIn", href: business.linkedin },
    business.instagram && {
      icon: AtSign,
      label: "Instagram",
      href: business.instagram.startsWith("http")
        ? business.instagram
        : `https://instagram.com/${business.instagram.replace(/^@/, "")}`,
    },
  ].filter(Boolean) as { icon: typeof Globe; label: string; href: string }[];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        {/* Cover */}
        <div className="relative mb-4 h-44 w-full overflow-hidden rounded-[var(--radius)] bg-muted sm:h-56">
          {business.coverUrl ? (
            <Image src={business.coverUrl} alt="" fill className="object-cover" sizes="900px" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-[#eaf0fb] to-accent" />
          )}
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="-mt-12 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] border-4 border-card bg-muted">
            {business.logoUrl ? (
              <Image src={business.logoUrl} alt="" width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
                {business.name}
              </h1>
              {ownerVerified && (
                <BadgeCheck className="h-5 w-5 text-success" aria-label="Verified Rotarian" />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {business.industryName && <Badge>{business.industryName}</Badge>}
              {business.categoryName && <span>{business.categoryName}</span>}
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {location}
                </span>
              )}
            </div>
          </div>
          {isOwner && (
            <Link
              href={`/dashboard/businesses/${business.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          )}
        </div>

        {/* Contact actions */}
        {contacts.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {contacts.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <c.icon className="h-4 w-4" /> {c.label}
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_260px]">
          <div className="space-y-8">
            {business.description && (
              <section>
                <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold">
                  About
                </h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {business.description}
                </p>
              </section>
            )}

            {business.images.length > 0 && (
              <section>
                <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
                  Gallery
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {business.images.map((img) => (
                    <div key={img.id} className="relative aspect-square overflow-hidden rounded-[var(--radius)] border border-border">
                      <Image src={img.url} alt="" fill className="object-cover" sizes="300px" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Owner card */}
          <aside>
            <Card>
              <CardContent>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rotarian owner
                </p>
                <Link
                  href={`/member/${business.ownerId}`}
                  className="mt-2 flex items-center gap-3 hover:opacity-90"
                >
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {business.owner.profile?.photoUrl ? (
                      <Image src={business.owner.profile.photoUrl} alt="" width={44} height={44} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {(business.owner.profile?.fullName ?? "?").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {business.owner.profile?.fullName ?? "Rotarian"}
                    </p>
                    {business.owner.rotaryInfo?.club && (
                      <p className="truncate text-xs text-muted-foreground">
                        {business.owner.rotaryInfo.club.name}
                      </p>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* Similar */}
        {similarHits.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
              Similar Rotarian businesses
            </h2>
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
