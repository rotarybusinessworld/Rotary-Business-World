import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/frontend/search/search-bar";
import { FacetSidebar } from "@/frontend/search/facet-sidebar";
import { FiltersPanel } from "@/frontend/search/filters-panel";
import { DirectoryCard } from "@/frontend/search/directory-card";
import { DirectoryRightRail } from "@/frontend/search/directory-right-rail";
import { IndustryChips } from "@/frontend/search/industry-chips";
import { getSearchService } from "@/backend/search";
import { loadTaxonomy } from "@/backend/taxonomy";
import { requirePaid } from "@/backend/auth-helpers";
import { buttonVariants } from "@/frontend/ui/button";
import { activeFilterCount } from "@/frontend/search/facet-utils";
import { BadgeCheck, SearchX } from "lucide-react";

export const metadata: Metadata = {
  title: "Directory",
  description: "Search verified Rotarian-owned businesses worldwide.",
};

type SP = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePaid("/directory");

  const sp = await searchParams;
  const q = first(sp.q);
  const industry = first(sp.industry);
  const category = first(sp.category);
  const country = first(sp.country);
  const city = first(sp.city);
  const page = Number(first(sp.page) ?? "1") || 1;
  // "Search instead for <original>" link sets force=1 to bypass did-you-mean.
  const forceOriginal = first(sp.force) === "1";

  const [result, taxonomy] = await Promise.all([
    getSearchService().search({ q, industry, category, country, city, page, forceOriginal }),
    loadTaxonomy(),
  ]);

  const current = { q, industry, category, country, city };
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const filterCount = activeFilterCount(current);

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* ── Sticky search bar ───────────────────────────────────────── */}
        <div className="sticky top-[68px] z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <SearchBar taxonomy={taxonomy} />
        </div>

        {/* ── Industry quick-browse chips ──────────────────────────── */}
        <IndustryChips industries={taxonomy.industries} />

        {/* ── Three-column grid ────────────────────────────────────────
            Mobile: 1 column (FiltersPanel first → center → right hidden)
            Desktop lg+: [248px | 1fr | 300px]
        ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[248px_minmax(0,1fr)_300px]">

          {/* ── LEFT: Filters ──────────────────────────────────────── */}
          <FiltersPanel activeCount={filterCount} current={current}>
            <FacetSidebar facets={result.facets} current={current} />
          </FiltersPanel>

          {/* ── CENTER: Results feed ───────────────────────────────── */}
          <section>
            {/* Did-you-mean banner */}
            {result.didYouMean && (
              <div className="mb-3 rounded-[var(--radius)] border border-border bg-muted/50 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Showing results for </span>
                <span className="font-medium text-foreground">
                  &ldquo;{result.didYouMean.corrected}&rdquo;
                </span>
                <span className="text-muted-foreground"> — search instead for </span>
                <Link
                  href={`/directory?q=${encodeURIComponent(result.didYouMean.original)}&force=1`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  &ldquo;{result.didYouMean.original}&rdquo;
                </Link>
              </div>
            )}

            {/* Feed header */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {result.total}
                </span>{" "}
                {result.total === 1 ? "business" : "businesses"}
                {(result.didYouMean?.corrected ?? q) ? (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-medium text-foreground">
                      &ldquo;{result.didYouMean?.corrected ?? q}&rdquo;
                    </span>
                  </>
                ) : null}
              </p>
              {/* Desktop: active-state for each filter lives in the left-rail FacetSidebar
                  (per-item × toggle). No duplicate chip here to avoid "clears all" confusion. */}
            </div>

            {/* Empty state */}
            {result.hits.length === 0 ? (
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-10 text-center">
                <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No businesses found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different search term or clear your filters.
                </p>
                {filterCount > 0 && (
                  <Link
                    href={q ? `/directory?q=${encodeURIComponent(q)}` : "/directory"}
                    className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-5`}
                  >
                    Clear filters
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {result.hits.map((hit, i) => (
                  <DirectoryCard key={hit.id} hit={hit} index={i} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination current={result.page} totalPages={totalPages} sp={sp} />
            )}

            {/* Mobile-only "List your business" CTA (right rail is hidden on mobile) */}
            <div className="mt-8 lg:hidden">
              <div className="relative overflow-hidden rounded-[var(--radius)] bg-navy px-5 py-6 text-white">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(60% 80% at 50% 0%, rgba(201,162,76,0.22), transparent 70%)",
                  }}
                />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-display)] text-sm font-semibold">
                      List your business
                    </p>
                    <p className="mt-0.5 text-xs text-white/65">
                      Get discovered by verified Rotarians worldwide.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/businesses/new"
                    className={`${buttonVariants({ variant: "gold", size: "sm" })} shrink-0`}
                  >
                    Get started
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile trust note */}
            <div className="mt-4 lg:hidden">
              <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Every member is verified against the official{" "}
                  <span className="font-medium text-foreground">Rotary roster</span>.
                </p>
              </div>
            </div>
          </section>

          {/* ── RIGHT: Contextual rail ─────────────────────────────── */}
          <DirectoryRightRail
            industries={result.facets.industry}
            current={current}
          />
        </div>
      </main>
    </>
  );
}

function Pagination({
  current,
  totalPages,
  sp,
}: {
  current: number;
  totalPages: number;
  sp: SP;
}) {
  function href(page: number) {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = first(v);
      if (val && k !== "page") next.set(k, val);
    }
    next.set("page", String(page));
    return `/directory?${next.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-center gap-2 text-sm"
    >
      {current > 1 && (
        <a
          href={href(current - 1)}
          className="rounded-full border border-border bg-card px-4 py-2 transition-colors duration-150 hover:border-primary/30 hover:bg-muted"
        >
          ← Previous
        </a>
      )}
      <span className="px-3 text-muted-foreground">
        Page {current} of {totalPages}
      </span>
      {current < totalPages && (
        <a
          href={href(current + 1)}
          className="rounded-full border border-border bg-card px-4 py-2 transition-colors duration-150 hover:border-primary/30 hover:bg-muted"
        >
          Next →
        </a>
      )}
    </nav>
  );
}
