"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { activeFilterChips, type FacetCurrent } from "./facet-utils";

/**
 * Responsive wrapper for the FacetSidebar.
 *
 * Desktop (lg+): renders children (FacetSidebar) in a sticky container.
 * Mobile: renders a "Filters" toggle button + active-filter chips; children
 *   are shown/hidden on demand. Data logic stays in the server-rendered children.
 */
export function FiltersPanel({
  children,
  activeCount,
  current,
}: {
  children: React.ReactNode;
  /** Number of active filters — shown as a badge on the mobile toggle. */
  activeCount: number;
  /** Current search/filter state — used to render removable chips on mobile. */
  current: FacetCurrent;
}) {
  const [open, setOpen] = useState(false);
  const chips = activeFilterChips(current);

  return (
    <>
      {/* ── Mobile: toggle + chips ─────────────────────────────────── */}
      <div className="flex flex-col gap-2 lg:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-filters-panel"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-[var(--shadow-card)] transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </button>

          {/* Active filter chips — tap to remove */}
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-muted"
            >
              {chip.label}
              <X className="h-3 w-3 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>

        {open && (
          <div id="mobile-filters-panel" className="mt-1">
            {children}
          </div>
        )}
      </div>

      {/* ── Desktop: always visible, sticky ───────────────────────── */}
      {/*
        top-[152px] = 68px header + ~77px sticky search bar + 7px gap.
        Prevents the sidebar card from sliding behind the search bar when sticking.
      */}
      <div className="sticky top-[152px] hidden lg:block">{children}</div>
    </>
  );
}
