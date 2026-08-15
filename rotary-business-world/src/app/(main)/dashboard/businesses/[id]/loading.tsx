import { Skeleton } from "@/frontend/ui/skeleton";

export default function EditBusinessLoading() {
  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {/* Photos section */}
          <Skeleton className="mb-4 h-3 w-32" />
          <div className="mb-6 flex gap-6">
            <Skeleton className="h-32 w-32 rounded-[var(--radius)]" />
            <Skeleton className="h-36 flex-1 rounded-[var(--radius)]" />
          </div>
          {/* Gallery */}
          <div className="mb-6 flex gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-24 rounded-[var(--radius)]" />
            ))}
          </div>
          {/* Fields */}
          <div className="space-y-4 border-t border-border pt-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
