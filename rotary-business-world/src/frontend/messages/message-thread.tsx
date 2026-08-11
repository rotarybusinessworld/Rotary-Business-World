"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markReadAction } from "@/backend/actions/messaging";
import type { MessageDTO } from "@/shared/types/messaging";
import { cn } from "@/shared/utils";
import { MessageComposer } from "./message-composer";

/** How often the thread polls for new messages. Tune here. */
const POLL_MS = 5000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageDTO[];
}) {
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Latest message timestamp, kept in a ref so the poller isn't a stale closure.
  const lastTsRef = useRef<string>(
    initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString(),
  );

  // Merge new messages (dedupe by id), advancing the poll cursor.
  const merge = useCallback((incoming: MessageDTO[]) => {
    if (incoming.length === 0) return false;
    let appended = false;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      appended = true;
      const next = [...prev, ...fresh];
      lastTsRef.current = next.at(-1)!.createdAt;
      return next;
    });
    return appended;
  }, []);

  // Mark read on open.
  useEffect(() => {
    void markReadAction(conversationId);
  }, [conversationId]);

  // Poll for replies.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/messages/${conversationId}?after=${encodeURIComponent(lastTsRef.current)}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data: { messages: MessageDTO[] } = await res.json();
        const appended = merge(data.messages);
        // Someone else's message arrived while we're looking — clear the badge.
        if (appended && data.messages.some((m) => m.senderId !== currentUserId)) {
          void markReadAction(conversationId);
        }
      } catch {
        // Network hiccup — next tick retries.
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [conversationId, currentUserId, merge]);

  // Keep pinned to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
      {messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No messages yet. Say hello 👋
        </p>
      ) : (
        messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                  mine
                    ? "rounded-br-sm bg-rotary-gold text-secondary-foreground"
                    : "rounded-bl-sm border border-border bg-card text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    mine ? "text-secondary-foreground/60" : "text-muted-foreground",
                  )}
                >
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversationId}
        onSent={(m) => merge([m])}
      />
    </>
  );
}
