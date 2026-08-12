"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Avatar } from "@/frontend/ui/avatar";
import { Badge } from "@/frontend/ui/badge";

const TITLES: Record<string, string> = {
  "/admin": "Overview",
  "/admin/verifications": "Verification queue",
  "/admin/districts": "Districts & Clubs",
};

function getTitle(pathname: string): string {
  return TITLES[pathname] ?? TITLES[pathname.replace(/\/$/, "")] ?? "Admin";
}

export function AdminTopbar({
  userName,
  roleLabel,
  onMenuClick,
}: {
  userName: string;
  roleLabel: string;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Page title */}
      <h2 className="flex-1 truncate font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
        {title}
      </h2>

      {/* Right: role badge + avatar */}
      <div className="flex items-center gap-3">
        <Badge variant="muted" className="hidden sm:inline-flex">
          {roleLabel}
        </Badge>
        <Avatar name={userName} size={32} />
      </div>
    </header>
  );
}
