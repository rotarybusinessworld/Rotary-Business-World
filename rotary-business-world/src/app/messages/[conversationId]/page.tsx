import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/frontend/site-header";
import { MessageThread } from "@/frontend/messages/message-thread";
import { requireVerified } from "@/backend/auth-helpers";
import * as messaging from "@/backend/messaging";
import { isAppError } from "@/backend/errors";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireVerified(`/messages/${conversationId}`);

  let thread;
  try {
    thread = await messaging.getConversation(user, conversationId);
  } catch (err) {
    if (isAppError(err)) notFound();
    throw err;
  }

  const initial = thread.other.fullName.charAt(0).toUpperCase();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex h-[calc(100dvh-68px)] w-full max-w-2xl flex-col">
        {/* Thread header */}
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <Link
            href="/messages"
            aria-label="Back to inbox"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link
            href={`/member/${thread.other.id}`}
            className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {thread.other.photoUrl ? (
                <Image
                  src={thread.other.photoUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  {initial}
                </span>
              )}
            </div>
            <p className="truncate font-[family-name:var(--font-display)] font-semibold">
              {thread.other.fullName}
            </p>
          </Link>
        </div>

        <MessageThread
          conversationId={thread.id}
          currentUserId={user.id}
          initialMessages={thread.messages}
        />
      </main>
    </>
  );
}
