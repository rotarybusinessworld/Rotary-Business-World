/**
 * Shared URL-building helpers for directory facet links.
 * Used by FacetSidebar (server), FiltersPanel (client), and DirectoryRightRail (server).
 * Pure TS — safe to import from either server or client components.
 */

export type FacetCurrent = Record<string, string | undefined>;

/** Toggle a facet param on/off. If `value` matches what's active, removes it; else sets it. */
export function withParam(
  current: FacetCurrent,
  key: string,
  value?: string,
): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== "page") next.set(k, v);
  }
  if (value && current[key] !== value) next.set(key, value);
  else next.delete(key);
  const qs = next.toString();
  return qs ? `/directory?${qs}` : "/directory";
}

/** href that clears all active filters but preserves the search query. */
export function clearFiltersHref(current: FacetCurrent): string {
  return current.q
    ? `/directory?q=${encodeURIComponent(current.q)}`
    : "/directory";
}

/** Number of active facet filters (industry, category, country, city). */
export function activeFilterCount(current: FacetCurrent): number {
  return (["industry", "category", "country", "city"] as const).filter(
    (k) => !!current[k],
  ).length;
}

/** Active facet chips — key/label/removeHref tuples for display. */
export function activeFilterChips(
  current: FacetCurrent,
): { key: string; label: string; href: string }[] {
  return (["industry", "category", "country", "city"] as const)
    .filter((k) => !!current[k])
    .map((key) => ({
      key,
      label: current[key]!,
      href: withParam(current, key), // omitting value removes the key
    }));
}
