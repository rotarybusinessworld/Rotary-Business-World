"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Menu, Search, ShieldCheck, X } from "lucide-react";

const panelLink =
  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white";

/** Mobile hamburger menu. Fed by the server `SiteHeader` (auth-aware). */
export function MobileNav({
  isAuthed,
  isAdmin,
  signOutAction,
}: {
  isAuthed: boolean;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/5 hover:text-white"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          {/* tap-to-close backdrop, below the header */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-x-0 bottom-0 top-[68px] z-40 bg-navy/60 backdrop-blur-sm"
          />
          {/* slide-down panel */}
          <div className="absolute inset-x-0 top-[68px] z-50 origin-top animate-fade-in-up border-b border-rotary-gold/15 bg-navy px-4 pb-5 pt-3 shadow-[var(--shadow-pop)]">
            <nav className="flex flex-col gap-1">
              <Link href="/directory" onClick={close} className={panelLink}>
                <Search className="h-4 w-4" />
                Directory
              </Link>

              {isAuthed ? (
                <>
                  <Link href="/dashboard" onClick={close} className={panelLink}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/verifications"
                      onClick={close}
                      className={panelLink}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  )}
                  <form action={signOutAction} className="mt-2">
                    <button
                      type="submit"
                      className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={close} className={panelLink}>
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={close}
                    className="mt-2 inline-flex items-center justify-center rounded-full bg-rotary-gold px-4 py-2.5 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-gold)] transition-colors hover:bg-rotary-gold-light"
                  >
                    Join the network
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
