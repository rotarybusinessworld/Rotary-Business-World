"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Avatar } from "@/frontend/ui/avatar";
import { useMobileNav } from "@/frontend/mobile-nav-context";

export function MobileNav({
  isAuthed,
  isAdmin,
  isVerified = false,
  canMessage = false,
  unread = 0,
  userId,
  userInitial,
  userName,
  photoUrl,
  signOutAction,
}: {
  isAuthed: boolean;
  isAdmin: boolean;
  isVerified?: boolean;
  canMessage?: boolean;
  unread?: number;
  userId?: string;
  userInitial?: string;
  userName?: string;
  photoUrl?: string | null;
  signOutAction: () => Promise<void>;
}) {
  const { active, setActive } = useMobileNav();
  const open = active === "menu";
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
      {/* Trigger — avatar when signed in, hamburger when signed out */}
      <button
        type="button"
        onClick={() => setActive(open ? null : "menu")}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className={
          isAuthed
            ? "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-rotary-gold/30 transition-all duration-150 hover:ring-rotary-gold/60 active:scale-95"
            : "inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/20 text-white/80 transition-all duration-150 hover:bg-white/[0.09] hover:ring-white/30 hover:text-white active:scale-95"
        }
      >
        {isAuthed ? (
          <Avatar name={userName || userInitial || "?"} photoUrl={photoUrl} size={36} />
        ) : (
          <span
            className="transition-all duration-200"
            style={{ transform: open ? "rotate(90deg)" : "none" }}
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop — h-[100dvh] not bottom-0: the header's backdrop-blur makes
              it the containing block for this fixed element, so bottom-0 would
              resolve to the 68px header bottom (zero-height, un-tappable). */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-x-0 top-[68px] z-40 h-[100dvh] bg-navy/70 backdrop-blur-[3px]"
          />

          {/* Slide-down panel */}
          <div className="absolute inset-x-0 top-[68px] z-50 overflow-hidden border-b border-white/[0.08] bg-navy shadow-[0_8px_32px_rgba(0,0,0,0.45)] animate-fade-in-up">

            {/* Gold hairline */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-rotary-gold/40 to-transparent" />

            <div className="px-4 pb-6 pt-5">

              {/* User identity when signed in */}
              {isAuthed && (
                <div className="mb-5 flex items-center gap-3.5 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-rotary-gold/25">
                    <Avatar
                      name={userName || userInitial || "?"}
                      photoUrl={photoUrl}
                      size={40}
                    />
                  </div>
                  <div className="min-w-0">
                    {userName && (
                      <p className="truncate text-sm font-semibold text-white">
                        {userName}
                      </p>
                    )}
                    <p className="text-[11px] text-white/45">Signed in as member</p>
                  </div>
                </div>
              )}

              {/* Nav section label */}
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Navigate
              </p>

              {/* Nav links */}
              <nav className="flex flex-col gap-0.5">
                <Link
                  href="/directory"
                  onClick={close}
                  className="group flex min-h-[48px] items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10"
                >
                  <Search className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                  Directory
                </Link>

                {isAuthed && userId && (
                  <Link
                    href={`/member/${userId}`}
                    onClick={close}
                    className="group flex min-h-[48px] items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10"
                  >
                    <UserRound className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                    View profile
                  </Link>
                )}

                {isVerified && (
                  <Link
                    href="/dashboard/profile"
                    onClick={close}
                    className="group flex min-h-[48px] items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10"
                  >
                    <Settings className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                    Edit profile
                  </Link>
                )}

                {isAuthed && (
                  <Link
                    href="/dashboard"
                    onClick={close}
                    className="group flex min-h-[48px] items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                    Dashboard
                  </Link>
                )}

                {canMessage && (
                  <Link
                    href="/messages"
                    onClick={close}
                    className="group flex min-h-[48px] items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                    Messages
                    {unread > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rotary-gold px-1.5 text-[11px] font-bold text-secondary-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin/verifications"
                    onClick={close}
                    className="group flex min-h-[48px] items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                    Admin
                  </Link>
                )}
              </nav>

              {/* Auth section */}
              <div className="mt-5 border-t border-white/[0.08] pt-5">
                {isAuthed ? (
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="group flex min-h-[48px] w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10"
                    >
                      <LogOut className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                      Sign out
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Link
                      href="/login"
                      onClick={close}
                      className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-white/80 transition-colors hover:border-white/35 hover:text-white"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      onClick={close}
                      className="flex min-h-[48px] items-center justify-center rounded-full bg-rotary-gold px-4 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-gold)] transition-colors hover:bg-rotary-gold-light"
                    >
                      Join the network
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
