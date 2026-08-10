import type { Metadata } from "next";
import { SiteHeader } from "@/frontend/site-header";
import { SearchBar } from "@/frontend/search/search-bar";
import { FacetSidebar } from "@/frontend/search/facet-sidebar";
import { BusinessCard } from "@/frontend/search/business-card";
import { getSearchService } from "@/backend/search";
import { SearchX } from "lucide-react";

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
  const sp = await searchParams;
  const q = first(sp.q);
  const industry = first(sp.industry);
  const country = first(sp.country);
  const city = first(sp.city);
  const page = Number(first(sp.page) ?? "1") || 1;

  const result = await getSearchService().search({
    q,
    industry,
    country,
    city,
    page,
  });

  const current = { q, industry, country, city };
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6">
          <SearchBar />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <FacetSidebar facets={result.facets} current={current} />

          <section>
            <p className="mb-4 text-sm text-muted-foreground">
              {result.total}{" "}
              {result.total === 1 ? "business" : "businesses"}
              {q ? (
                <>
                  {" "}for <span className="font-medium text-foreground">“{q}”</span>
                </>
              ) : null}
            </p>

            {result.hits.length === 0 ? (
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-10 text-center">
                <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No businesses found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different search term or clear your filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {result.hits.map((hit) => (
                  <BusinessCard key={hit.id} hit={hit} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <Pagination
                current={result.page}
                totalPages={totalPages}
                sp={sp}
              />
            )}
          </section>
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
    <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
      {current > 1 && (
        <a href={href(current - 1)} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Previous
        </a>
      )}
      <span className="text-muted-foreground">
        Page {current} of {totalPages}
      </span>
      {current < totalPages && (
        <a href={href(current + 1)} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Next
        </a>
      )}
    </nav>
  );
}
