import Link from "next/link";
import { cn } from "@/shared/utils";
import type { Facet } from "@/backend/search/types";

type Current = Record<string, string | undefined>;

function withParam(current: Current, key: string, value?: string): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== "page") next.set(k, v);
  }
  if (value && current[key] !== value) next.set(key, value);
  else next.delete(key);
  const qs = next.toString();
  return qs ? `/directory?${qs}` : "/directory";
}

function FacetGroup({
  title,
  paramKey,
  facets,
  current,
}: {
  title: string;
  paramKey: string;
  facets: Facet[];
  current: Current;
}) {
  if (facets.length === 0) return null;
  const active = current[paramKey];
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                  isActive && "bg-accent font-medium text-accent-foreground",
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
  current: Current;
}) {
  const hasFilters = current.industry || current.country || current.city;
  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] font-semibold">
          Filters
        </h2>
        {hasFilters && (
          <Link
            href={current.q ? `/directory?q=${encodeURIComponent(current.q)}` : "/directory"}
            className="text-xs text-primary hover:underline"
          >
            Clear all
          </Link>
        )}
      </div>
      <FacetGroup title="Industry" paramKey="industry" facets={facets.industry} current={current} />
      <FacetGroup title="Country" paramKey="country" facets={facets.country} current={current} />
    </aside>
  );
}
