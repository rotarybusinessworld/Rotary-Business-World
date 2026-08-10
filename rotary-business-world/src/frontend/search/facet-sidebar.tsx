import Link from "next/link";
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
      <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </h3>
      <ul>
        {facets.map((f) => {
          const isActive = active === f.value;
          return (
            <li key={f.value}>
              <Link
                href={withParam(current, paramKey, f.value)}
                className={cn(
                  "flex min-h-[40px] items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-muted",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-foreground/80",
                )}
              >
                <span className="truncate">{f.value}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {isActive ? "×" : f.count}
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
  const hasFilters = current.industry || current.country || current.city;
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
            className="text-xs text-primary hover:underline"
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
