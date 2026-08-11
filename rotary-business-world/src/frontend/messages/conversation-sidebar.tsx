"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { MessagesSquare, Search } from "lucide-react";
import { cn } from "@/shared/utils";
import { Avatar } from "@/frontend/ui/avatar";
import type { ConversationSummary } from "@/shared/types/messaging";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  // Derive the active conversation from the URL (/messages/<id>).
  const activeId =
    pathname.startsWith("/messages/") ? pathname.split("/")[2] : null;

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) =>
      c.other.fullName.toLowerCase().includes(q),
    );
  }, [conversations, query]);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card md:w-80 lg:w-96",
        // Mobile: show the sidebar only when no thread is open.
        activeId ? "hidden md:flex" : "flex w-full",
      )}
    >
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Inbox
        </p>
        <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-bold">
          Messages
        </h1>
      </div>

      {/* Search filter */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full rounded-full border border-input bg-muted/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/80"
          />
        </div>
      </div>

      {/* Conversation rows */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {query ? "No results" : "No conversations yet"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={cn(
                  "flex items-center gap-3 border-b border-border px-4 py-3 transition-colors",
                  isActive ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <Avatar
                  name={conv.other.fullName}
                  photoUrl={conv.other.photoUrl}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm",
                        conv.unread ? "font-semibold text-foreground" : "font-medium",
                      )}
                    >
                      {conv.other.fullName}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatWhen(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-xs",
                      conv.unread ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {conv.lastMessagePreview ?? "No messages yet"}
                  </p>
                </div>

                {/* Unread indicator */}
                {conv.unread && (
                  <span
                    aria-label="Unread"
                    className="h-2 w-2 shrink-0 rounded-full bg-rotary-gold"
                  />
                )}
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
