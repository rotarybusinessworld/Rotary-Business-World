import { cn } from "@/shared/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  value,
  label,
  hint,
  accent = false,
  className,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  hint?: string;
  /** Gold accent ring — use for the most important metric (e.g. pending queue). */
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius)] border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-pop)]",
        accent ? "border-rotary-gold/30" : "border-border",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          accent
            ? "bg-rotary-gold/15 text-rotary-gold-dark"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>

      <div>
        <p
          className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-none tracking-tight text-foreground"
        >
          {value}
        </p>
        <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">{hint}</p>
        )}
      </div>
    </div>
  );
}
