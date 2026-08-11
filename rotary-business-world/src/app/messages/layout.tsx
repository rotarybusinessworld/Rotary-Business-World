import { SiteHeader } from "@/frontend/site-header";
import { ConversationSidebar } from "@/frontend/messages/conversation-sidebar";
import { requireVerified } from "@/backend/auth-helpers";
import * as messaging from "@/backend/messaging";

/**
 * Persistent two-pane shell for all /messages routes.
 *
 * Desktop: sidebar (list) + right pane (thread or empty state).
 * Mobile: sidebar fills the screen at /messages; thread fills it at /messages/[id].
 * The sidebar is a client component that derives the active row from usePathname.
 *
 * Note: listConversations is called here so the sidebar shows current data on
 * every server render. Use revalidatePath("/messages", "layout") in messaging
 * actions so sending / marking-read refreshes this layout.
 */
export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireVerified("/messages");
  const conversations = await messaging.listConversations(user);

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex h-[calc(100dvh-68px)] w-full max-w-6xl border-x border-border">
        <ConversationSidebar conversations={conversations} />
        {/* Right pane — must be min-h-0 so inner flex-col children can scroll */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
        </section>
      </div>
    </>
  );
}
