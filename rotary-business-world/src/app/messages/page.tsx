import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Search } from "lucide-react";
import { SiteHeader } from "@/frontend/site-header";
import { ConversationListItem } from "@/frontend/messages/conversation-list-item";
import { buttonVariants } from "@/frontend/ui/button";
import { requireVerified } from "@/backend/auth-helpers";
import * as messaging from "@/backend/messaging";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireVerified("/messages");
  const conversations = await messaging.listConversations(user);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Inbox
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
            Messages
          </h1>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-card py-12 text-center">
            <MessagesSquare className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No conversations yet. Reach out to a member from their profile.
            </p>
            <Link
              href="/directory"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Search className="h-4 w-4" />
              Browse the directory
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {conversations.map((conv) => (
              <ConversationListItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
