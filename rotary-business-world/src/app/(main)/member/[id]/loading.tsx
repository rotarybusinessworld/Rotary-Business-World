import { Skeleton } from "@/frontend/ui/skeleton";

/** Instant skeleton shown while the member profile server component fetches. */
export default function MemberLoading() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        {/* Hero card */}
        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]">
          {/* Navy top band */}
          <Skeleton className="h-24 w-full rounded-none sm:h-28" />
          {/* Info block */}
          <div className="px-4 pb-6 sm:px-6">
            <Skeleton className="-mt-12 h-24 w-24 shrink-0 rounded-full ring-4 ring-card" />
            <Skeleton className="mt-3 h-8 w-52" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full max-w-lg" />
              <Skeleton className="h-4 w-3/4 max-w-md" />
            </div>
          </div>
        </div>

        {/* Businesses section */}
        <div className="mt-8">
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-[var(--radius)] border border-border bg-card p-4"
              >
                <div className="flex gap-3">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-[var(--radius)]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
