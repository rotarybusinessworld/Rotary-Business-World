import { Star, StarHalf } from "lucide-react";
import { Avatar } from "@/frontend/ui/avatar";
import { cn } from "@/shared/utils";
import type { ReviewsSummary } from "@/backend/services/review";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-4 w-4",
            n <= rating
              ? "fill-rotary-gold text-rotary-gold"
              : "fill-transparent text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function ReviewSummary({
  count,
  average,
}: {
  count: number;
  average: number | null;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <StarDisplay rating={Math.round(average ?? 0)} />
      <span className="text-sm font-semibold">{average?.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">
        ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}

export function ReviewList({ summary }: { summary: ReviewsSummary }) {
  if (summary.count === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No reviews yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {summary.reviews.map((r) => (
        <div key={r.id} className="flex gap-3">
          <Avatar
            name={r.reviewer.fullName}
            photoUrl={r.reviewer.photoUrl ?? undefined}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{r.reviewer.fullName}</span>
              <StarDisplay rating={r.rating} />
              <span className="text-xs text-muted-foreground">
                {formatDate(r.createdAt)}
              </span>
            </div>
            {r.body && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {r.body}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
