import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { buttonVariants } from "@/frontend/ui/button";
import type { Facet } from "@/backend/search/types";
import { withParam, type FacetCurrent } from "./facet-utils";

/**
 * Contextual right-rail column — desktop only (hidden below lg).
 * Fills the third column with premium content so no dead space shows:
 *   1. "List your business" navy CTA card
 *   2. Popular industries quick-links (from live facet data)
 *   3. Verified-member trust note
 */
export function DirectoryRightRail({
  industries,
  current,
}: {
  industries: Facet[];
  current: FacetCurrent;
}) {
  return (
    <aside aria-label="Directory sidebar" className="hidden space-y-4 lg:block">
      {/* ── List your business CTA ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[var(--radius)] bg-navy px-5 py-6 text-white shadow-[var(--shadow-card)]">
        {/* Radial gold glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, rgba(201,162,76,0.22), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="font-[family-name:var(--font-display)] text-base font-semibold leading-snug">
            List your business
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/65">
            Join the global network of verified Rotarian businesses and get
            discovered by members worldwide.
          </p>
          <Link
            href="/dashboard/businesses/new"
            className={`${buttonVariants({ variant: "gold", size: "sm" })} mt-4 w-full justify-center`}
          >
            Get started
          </Link>
        </div>
      </div>

      {/* ── Popular industries ──────────────────────────────────── */}
      {industries.length > 0 && (
        <div className="rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border px-4 py-3.5">
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold">
              Popular industries
            </h3>
          </div>
          <ul className="p-2">
            {industries.slice(0, 6).map((f) => {
              const isActive = current.industry === f.value;
              return (
                <li key={f.value}>
                  <Link
                    href={withParam(current, "industry", f.value)}
                    className={`flex min-h-[40px] items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted ${
                      isActive
                        ? "font-medium text-primary"
                        : "text-foreground/80"
                    }`}
                  >
                    <span className="truncate">{f.value}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {f.count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Trust note ──────────────────────────────────────────── */}
      <div className="rounded-[var(--radius)] border border-border bg-card px-4 py-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <BadgeCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-success"
            aria-hidden
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every member is verified against the official{" "}
            <span className="font-medium text-foreground">Rotary roster</span>.
            Only verified Rotarians can list a business.
          </p>
        </div>
      </div>
    </aside>
  );
}
