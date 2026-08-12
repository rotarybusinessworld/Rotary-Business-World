import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/shared/utils";
import type { Facet } from "@/backend/search/types";
import { withParam, clearFiltersHref, type FacetCurrent } from "./facet-utils";

function FacetGroup({
  title,
  paramKey,
  facets,
  current,
}: {
  title: string;
  paramKey: string;
  facets: Facet[];
  current: FacetCurrent;
}) {
  if (facets.length === 0) return null;
  const active = current[paramKey];

  return (
    <div>
      <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-0.5">
        {facets.map((f) => {
          const isActive = active === f.value;
          return (
            <li key={f.value}>
              <Link
                href={withParam(current, paramKey, f.value)}
                className={cn(
                  "flex min-h-[44px] items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                  isActive
                    ? "bg-navy/[0.07] font-semibold text-navy"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {/* gold left accent when active */}
                  <span
                    className={cn(
                      "h-3.5 w-0.5 shrink-0 rounded-full transition-colors duration-150",
                      isActive ? "bg-rotary-gold" : "bg-transparent",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{f.value}</span>
                </span>
                <span className="shrink-0">
                  {isActive ? (
                    <Check className="h-3.5 w-3.5 text-rotary-gold-dark" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{f.count}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FacetSidebar({
  facets,
  current,
}: {
  facets: { industry: Facet[]; country: Facet[] };
  current: FacetCurrent;
}) {
  const hasFilters = current.industry || current.category || current.country || current.city;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold">
          Filters
        </h2>
        {hasFilters && (
          <Link
            href={clearFiltersHref(current)}
            className="text-xs font-medium text-rotary-gold-dark hover:underline"
          >
            Clear all
          </Link>
        )}
      </div>

      {/* Filter groups */}
      <div className="space-y-5 p-3">
        <FacetGroup
          title="Industry"
          paramKey="industry"
          facets={facets.industry}
          current={current}
        />
        <FacetGroup
          title="Country"
          paramKey="country"
          facets={facets.country}
          current={current}
        />
      </div>
    </div>
  );
}
