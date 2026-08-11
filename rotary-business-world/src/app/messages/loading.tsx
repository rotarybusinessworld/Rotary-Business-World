import { Skeleton } from "@/frontend/ui/skeleton";

/**
 * Right-pane skeleton while a conversation thread loads.
 * SiteHeader and the sidebar are provided by layout.tsx — don't render them here.
 */
export default function MessagesLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-36" />
      </div>

      {/* Message bubbles */}
      <div className="flex-1 space-y-4 px-4 py-5">
        {[false, true, false, false, true].map((mine, i) => (
          <div key={i} className={mine ? "flex justify-end" : "flex"}>
            <Skeleton className="h-10 w-44 rounded-2xl" />
          </div>
        ))}
      </div>

      {/* Composer placeholder */}
      <div className="border-t border-border px-4 py-3">
        <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
      </div>
    </div>
  );
}
