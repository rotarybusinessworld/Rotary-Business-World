import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/frontend/ui/badge";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { cn } from "@/shared/utils";
import type { BusinessHit } from "@/backend/search/types";

/**
 * Directory-specific feed card — LinkedIn-style with lift hover and a gold footer CTA.
 * Isolated from the shared BusinessCard so other routes (similar rail, member profiles)
 * are unaffected by directory-only styling changes.
 */
export function DirectoryCard({
  hit,
  index = 0,
}: {
  hit: BusinessHit;
  /** Used for entrance stagger (capped at 5). */
  index?: number;
}) {
  const location = [hit.city, hit.country].filter(Boolean).join(", ");
  const stagger = index < 5 ? (`stagger-${index + 1}` as const) : "";

  return (
    <Link
      href={`/business/${hit.slug}`}
      className={cn(
        "group block rounded-[var(--radius)] border border-border bg-card",
        "shadow-[var(--shadow-card)] transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]",
        "animate-fade-in-up",
        stagger,
      )}
    >
      {/* Card body */}
      <div className="flex gap-4 p-4 sm:p-5">
        {/* Logo box */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted">
          {hit.logoUrl ? (
            <Image
              src={hit.logoUrl}
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
          {/* Name + verified */}
          <div className="flex items-center gap-2">
            <h3 className="truncate font-[family-name:var(--font-display)] font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
              {hit.name}
            </h3>
            {hit.ownerVerified && (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-success"
                aria-label="Verified Rotarian"
              />
            )}
          </div>

          {/* Industry + category */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {hit.industryName && (
              <Badge variant="default" size="sm">
                {hit.industryName}
              </Badge>
            )}
            {hit.categoryName && (
              <span className="text-xs text-muted-foreground">
                {hit.categoryName}
              </span>
            )}
          </div>

          {/* Location */}
          {location && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </p>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border px-4 py-2.5 sm:px-5">
        <span className="text-xs font-medium text-rotary-gold-dark transition-colors duration-150 group-hover:text-rotary-gold">
          View business →
        </span>
      </div>
    </Link>
  );
}
