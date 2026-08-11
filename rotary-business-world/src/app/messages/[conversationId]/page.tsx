import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/frontend/ui/avatar";
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        {/* Back arrow — visible on mobile only; desktop keeps the sidebar */}
        <Link
          href="/messages"
          aria-label="Back to inbox"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <Link
          href={`/member/${thread.other.id}`}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <Avatar
            name={thread.other.fullName}
            photoUrl={thread.other.photoUrl}
            size={36}
          />
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
    </div>
  );
}
