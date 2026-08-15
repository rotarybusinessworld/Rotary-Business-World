"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

const SIDEBAR_W = 220; // px — desktop fixed sidebar width

export function AdminShell({
  isSuperAdmin,
  userName,
  roleLabel,
  signOutAction,
  children,
}: {
  isSuperAdmin: boolean;
  userName: string;
  roleLabel: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Body-scroll lock while mobile drawer is open (mirrors filters-panel.tsx pattern)
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const close = () => setDrawerOpen(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop sidebar (fixed, always visible ≥ lg) ───────────── */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col"
        style={{ width: SIDEBAR_W }}
      >
        <AdminSidebar
          isSuperAdmin={isSuperAdmin}
          roleLabel={roleLabel}
          signOutAction={signOutAction}
        />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
            onClick={close}
            aria-hidden
          />
          {/* Drawer panel */}
          <div
            className="fixed inset-y-0 left-0 z-50 flex flex-col animate-slide-up lg:hidden"
            style={{ width: SIDEBAR_W }}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
          >
            {/* Close button overlay */}
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <AdminSidebar
              isSuperAdmin={isSuperAdmin}
              roleLabel={roleLabel}
              signOutAction={signOutAction}
              onNavigate={close}
            />
          </div>
        </>
      )}

      {/* ── Content column ────────────────────────────────────────── */}
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{ paddingLeft: undefined }}
      >
        {/* On lg+ we offset the content by the sidebar width */}
        <div className="lg:pl-[220px]">
          <AdminTopbar
            userName={userName}
            roleLabel={roleLabel}
            onMenuClick={() => setDrawerOpen(true)}
          />
          <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
