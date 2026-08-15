import { Skeleton } from "@/frontend/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        {/* Business cards grid */}
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]"
            >
              <div className="flex gap-4 p-4 sm:p-5">
                <Skeleton className="h-14 w-14 shrink-0 rounded-[var(--radius)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
              <div className="flex gap-2 border-t border-border px-4 py-3">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
