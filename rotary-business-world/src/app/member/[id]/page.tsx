import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/frontend/site-header";
import { BusinessCard } from "@/frontend/search/business-card";
import { Badge } from "@/frontend/ui/badge";
import { db } from "@/backend/db";
import type { BusinessHit } from "@/backend/search/types";
import { BadgeCheck, Globe2 } from "lucide-react";

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

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();

  const verified = member.status === "VERIFIED";
  const club = member.rotaryInfo?.club?.name;
  const district = member.rotaryInfo?.district?.code ?? member.rotaryInfo?.district?.name;

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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {member.profile?.photoUrl ? (
              <Image src={member.profile.photoUrl} alt="" width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-muted-foreground">
                {(member.profile?.fullName ?? "?").charAt(0)}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
                {member.profile?.fullName ?? "Rotarian"}
              </h1>
              {verified && <BadgeCheck className="h-5 w-5 text-success" aria-label="Verified" />}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {verified && <Badge variant="verified">Verified Rotarian</Badge>}
              {club && <span>{club}</span>}
              {district && (
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="h-3.5 w-3.5" /> District {district}
                </span>
              )}
            </div>
            {member.profile?.bio && (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                {member.profile.bio}
              </p>
            )}
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
            Businesses
          </h2>
          {hits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No businesses listed yet.</p>
          ) : (
            <div className="grid gap-3">
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
