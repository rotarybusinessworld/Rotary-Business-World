import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Search } from "lucide-react";
import { buttonVariants } from "@/frontend/ui/button";

export const metadata: Metadata = { title: "Messages" };

/**
 * Right-pane empty state shown on desktop when no conversation is selected.
 * On mobile this is hidden (the sidebar fills the viewport at /messages).
 * Auth is handled by the parent layout.tsx.
 */
export default function MessagesPage() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-8 text-center md:flex">
      <MessagesSquare className="h-12 w-12 text-muted-foreground/20" />
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
        Select a conversation
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Choose from the list on the left, or find a Rotarian in the directory.
      </p>
      <Link
        href="/directory"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Search className="h-4 w-4" />
        Browse the directory
      </Link>
    </div>
  );
}
