"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/frontend/ui/avatar";
import type { Role, UserStatus } from "@prisma/client";

const menuLink =
  "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white";

export function ProfileMenu({
  userId,
  name,
  email,
  photoUrl,
  isAdmin,
  isVerified,
  signOutAction,
}: {
  userId: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click-outside and Escape
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger — avatar button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-rotary-gold/25 transition-all duration-150 hover:ring-rotary-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rotary-gold/60 active:scale-95"
        style={{ overflow: "hidden" }}
      >
        {/* Inline avatar ring styling around the Avatar component */}
        <Avatar name={name || email} photoUrl={photoUrl} size={32} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/[0.09] bg-navy shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fade-in-up"
        >
          {/* Gold hairline */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-rotary-gold/40 to-transparent" />

          {/* Identity header */}
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
            <Avatar name={name || email} photoUrl={photoUrl} size={40} />
            <div className="min-w-0">
              {name && (
                <p className="truncate text-sm font-semibold text-white">{name}</p>
              )}
              <p className="truncate text-[11px] text-white/45">{email}</p>
            </div>
          </div>

          {/* Menu links */}
          <div className="px-2 py-2">
            <Link
              href={`/member/${userId}`}
              onClick={close}
              role="menuitem"
              className={menuLink}
            >
              <UserRound className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
              View profile
            </Link>

            {isVerified && (
              <Link
                href="/dashboard/profile"
                onClick={close}
                role="menuitem"
                className={menuLink}
              >
                <Settings className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                Edit profile
              </Link>
            )}

            <Link
              href="/dashboard"
              onClick={close}
              role="menuitem"
              className={menuLink}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
              Dashboard
            </Link>

            {isAdmin && (
              <Link
                href="/admin/verifications"
                onClick={close}
                role="menuitem"
                className={menuLink}
              >
                <ShieldCheck className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                Admin
              </Link>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-white/[0.08] px-2 py-2">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className={menuLink + " text-white/50"}
              >
                <LogOut className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
