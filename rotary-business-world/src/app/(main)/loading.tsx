import { Skeleton } from "@/frontend/ui/skeleton";

/** Root fallback — shown for routes that don't have their own loading.tsx. */
export default function Loading() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius)] border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex gap-4">
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
      </main>
    </>
  );
}
