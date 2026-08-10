import { SiteHeader } from "@/frontend/site-header";
import { Skeleton } from "@/frontend/ui/skeleton";

/** Instant skeleton shown while the directory server component fetches search results. */
export default function DirectoryLoading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Sticky search bar placeholder */}
        <div className="sticky top-[68px] z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>

        <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[248px_minmax(0,1fr)_300px]">
          {/* Left rail skeleton */}
          <div className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Center column skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]"
              >
                <div className="flex gap-4 p-4">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-[var(--radius)]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <div className="border-t border-border px-4 py-2.5">
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>

          {/* Right rail skeleton — desktop only */}
          <div className="hidden space-y-4 lg:block">
            <Skeleton className="h-36 w-full rounded-[var(--radius)]" />
            <Skeleton className="h-52 w-full rounded-[var(--radius)]" />
            <Skeleton className="h-20 w-full rounded-[var(--radius)]" />
          </div>
        </div>
      </main>
    </>
  );
}
