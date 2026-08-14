"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  LayoutDashboard,
  LogOut,
  Store,
} from "lucide-react";
import { cn } from "@/shared/utils";
import { Logo } from "@/frontend/brand/logo";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
};

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Verifications", href: "/admin/verifications", icon: BadgeCheck },
  { label: "Listings", href: "/admin/listings", icon: Store },
  { label: "Districts & Clubs", href: "/admin/districts", icon: Building2, superAdminOnly: true },
];

export function AdminSidebar({
  isSuperAdmin,
  roleLabel,
  onNavigate,
}: {
  isSuperAdmin: boolean;
  roleLabel: string;
  /** Called when a nav link is clicked — used to close the mobile drawer. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-full flex-col bg-navy">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <Logo size={34} showText={false} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">
            RBW Admin
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-rotary-gold-light">
            Console
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Admin navigation">
        {NAV.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13.5px] font-medium transition-all duration-150",
                active
                  ? "bg-rotary-gold/15 text-rotary-gold-light"
                  : "text-white/60 hover:bg-white/[0.07] hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-rotary-gold-light" : "text-white/40",
                )}
              />
              {item.label}
              {/* Active dot */}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rotary-gold" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-4 space-y-1">
        <div className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2">
          <span className="inline-flex items-center rounded-full border border-rotary-gold/30 bg-rotary-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rotary-gold-light">
            {roleLabel}
          </span>
        </div>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13px] text-white/40 transition-colors hover:bg-white/[0.07] hover:text-white/70"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 rotate-180" />
          Back to site
        </Link>
      </div>
    </div>
  );
}
