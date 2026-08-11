import Link from "next/link";
import Image from "next/image";
import { cn } from "@/shared/utils";
import type { ConversationSummary } from "@/shared/types/messaging";

/** Short, relative-ish timestamp: time if today, otherwise a date. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationListItem({ conv }: { conv: ConversationSummary }) {
  const initial = conv.other.fullName.charAt(0).toUpperCase();
  return (
    <Link
      href={`/messages/${conv.id}`}
      className="group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[var(--shadow-pop)]"
    >
      {/* Avatar */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
        {conv.other.photoUrl ? (
          <Image
            src={conv.other.photoUrl}
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-base font-semibold text-muted-foreground">
            {initial}
          </span>
        )}
      </div>

      {/* Name + preview */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate",
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
            "mt-0.5 truncate text-sm",
            conv.unread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {conv.lastMessagePreview ?? "No messages yet"}
        </p>
      </div>

      {/* Unread dot */}
      {conv.unread && (
        <span
          aria-label="Unread"
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-rotary-gold"
        />
      )}
    </Link>
  );
}
