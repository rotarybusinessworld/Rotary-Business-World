import { SiteHeader } from "@/frontend/site-header";
import { Skeleton } from "@/frontend/ui/skeleton";

/** Instant skeleton while the inbox loads. */
export default function MessagesLoading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)]"
            >
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
