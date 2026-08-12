"use client";

import { useEffect } from "react";
import { Search, X } from "lucide-react";
import { NavSearch } from "@/frontend/search/nav-search";
import { useMobileNav } from "@/frontend/mobile-nav-context";

/**
 * Mobile search trigger — a search icon button that slides open a full-width
 * NavSearch bar just below the 68px header. Shares open-state with MobileNav via
 * MobileNavProvider so only one dropdown (and one backdrop) is ever open.
 */
export function NavSearchMobile() {
  const { active, setActive } = useMobileNav();
  const open = active === "search";
  const close = () => setActive(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Search icon trigger */}
      <button
        type="button"
        onClick={() => setActive(open ? null : "search")}
        aria-label={open ? "Close search" : "Search"}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 ring-1 ring-white/15 transition-all duration-150 hover:bg-white/[0.08] hover:text-white hover:ring-white/30 active:scale-95"
      >
        {open ? <X className="h-[17px] w-[17px]" /> : <Search className="h-[17px] w-[17px]" />}
      </button>

      {open && (
        <>
          {/* Dimmed backdrop — closes on tap. h-[100dvh] not bottom-0: the
              header's backdrop-blur is the containing block for this fixed
              element, so bottom-0 collapses it to the 68px header (un-tappable). */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-x-0 top-[68px] z-40 h-[100dvh] bg-navy/70 backdrop-blur-[3px]"
          />

          {/* Full-width search bar slide-down */}
          <div className="absolute inset-x-0 top-[68px] z-50 border-b border-white/[0.08] bg-navy px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] animate-fade-in-up">
            {/* Gold hairline */}
            <div className="mb-3 h-px w-full bg-gradient-to-r from-transparent via-rotary-gold/30 to-transparent" />
            <NavSearch autoFocus onNavigate={close} className="w-full" />
          </div>
        </>
      )}
    </div>
  );
}
