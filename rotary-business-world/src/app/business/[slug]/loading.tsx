import { SiteHeader } from "@/frontend/site-header";
import { Skeleton } from "@/frontend/ui/skeleton";

/** Instant skeleton shown while the business detail server component fetches data. */
export default function BusinessLoading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Hero card */}
        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]">
          {/* Cover */}
          <Skeleton className="h-48 w-full rounded-none sm:h-64 lg:h-72" />
          {/* Info block */}
          <div className="px-4 pb-5 pt-0 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <Skeleton className="-mt-12 h-24 w-24 shrink-0 rounded-[var(--radius)] ring-4 ring-card" />
              <Skeleton className="mb-1 h-9 w-28 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-8 w-3/5" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </div>
        </div>

        {/* Contact bar */}
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>

        {/* Main grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Left */}
          <div className="space-y-6">
            <div className="rounded-[var(--radius)] border border-border bg-card p-5 sm:p-6">
              <Skeleton className="mb-3 h-5 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="rounded-[var(--radius)] border border-border bg-card p-5 sm:p-6">
              <Skeleton className="mb-4 h-5 w-20" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-[var(--radius)]" />
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="rounded-[var(--radius)] border border-border bg-card p-5">
              <Skeleton className="mb-4 h-5 w-28" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 shrink-0 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[var(--radius)] border border-border bg-card p-5">
              <Skeleton className="mb-3 h-3 w-24" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
