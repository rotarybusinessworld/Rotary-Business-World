import { Skeleton } from "@/frontend/ui/skeleton";

export default function ProfileLoading() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {/* Avatar + name */}
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          {/* Fields */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="mb-1.5 h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
