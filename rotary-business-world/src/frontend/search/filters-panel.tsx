"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { activeFilterChips, type FacetCurrent } from "./facet-utils";

export function FiltersPanel({
  children,
  activeCount,
  current,
}: {
  children: React.ReactNode;
  activeCount: number;
  current: FacetCurrent;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const chips = activeFilterChips(current);

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* ── Mobile: toggle button + active chips ───────────────────── */}
      <div className="lg:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-filters-drawer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-primary/20 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          {/* Removable active-filter chips */}
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-rotary-gold/40 bg-rotary-gold/10 px-3 py-1.5 text-xs font-medium text-rotary-gold-dark transition-colors hover:bg-rotary-gold/20"
            >
              {chip.label}
              <X className="h-3 w-3 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>

        {/* Bottom sheet drawer */}
        {open && (
          <>
            {/* Backdrop */}
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />

            {/* Sheet */}
            <div
              id="mobile-filters-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80svh] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-[var(--shadow-pop)] animate-slide-up"
            >
              {/* Handle + header */}
              <div className="sticky top-0 z-10 border-b border-border bg-card px-5 pb-3.5 pt-4">
                <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-muted-foreground/20" />
                <div className="flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                    Filters
                    {activeCount > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[10px] font-bold text-white">
                        {activeCount}
                      </span>
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close filters"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filter content */}
              <div className="p-5" onClick={close}>
                {children}
              </div>

              {/* Safe-area bottom padding for mobile */}
              <div className="h-safe-area-inset-bottom min-h-4" />
            </div>
          </>
        )}
      </div>

      {/* ── Desktop: always visible, sticky ───────────────────────── */}
      <div className="sticky top-[152px] hidden lg:block">{children}</div>
    </>
  );
}
