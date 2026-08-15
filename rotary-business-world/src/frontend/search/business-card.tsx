import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/frontend/ui/badge";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import type { BusinessHit } from "@/backend/search/types";
import { toImageSrc } from "@/shared/image";

export function BusinessCard({ hit }: { hit: BusinessHit }) {
  const location = [hit.city, hit.country].filter(Boolean).join(", ");
  return (
    <Link
      href={`/business/${hit.slug}`}
      className="group flex gap-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted">
        {hit.logoKey ? (
          <Image
            src={toImageSrc(hit.logoKey)!}
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        ) : (
          <Building2 className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
            {hit.name}
          </h3>
          {hit.ownerVerified && (
            <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-label="Verified Rotarian" />
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {hit.industryName && <Badge variant="default">{hit.industryName}</Badge>}
          {hit.categoryName && <span>{hit.categoryName}</span>}
        </div>

        {location && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </p>
        )}
      </div>
    </Link>
  );
}
