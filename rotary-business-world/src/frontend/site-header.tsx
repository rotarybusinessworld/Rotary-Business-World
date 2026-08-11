import Link from "next/link";
import { auth, signOut } from "@/backend/auth";
import { Logo } from "@/frontend/brand/logo";
import { MobileNav } from "@/frontend/mobile-nav";
import * as messaging from "@/backend/messaging";
import { LayoutDashboard, MessageCircle, Search, ShieldCheck } from "lucide-react";

const navLink =
  "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/65 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "CLUB_ADMIN";
  const canMessage = user?.status === "VERIFIED";
  const unread = canMessage ? await messaging.countUnread(user) : 0;
  const userInitial =
    (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-navy/95 backdrop-blur supports-[backdrop-filter]:bg-navy/80">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">

        {/* Logo — full wordmark always */}
        <Link
          href="/"
          aria-label="Rotary Business World home"
          className="shrink-0 min-w-0"
        >
          <Logo tone="light" size={32} />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-0.5 md:flex">
          <Link href="/directory" className={navLink}>
            <Search className="h-3.5 w-3.5" />
            Directory
          </Link>
          {user && (
            <Link href="/dashboard" className={navLink}>
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          )}
          {canMessage && (
            <Link href="/messages" className={navLink}>
              <MessageCircle className="h-3.5 w-3.5" />
              Messages
              {unread > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rotary-gold px-1 text-[10px] font-bold text-secondary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/verifications" className={navLink}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop auth area */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <div
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rotary-gold/15 text-[13px] font-semibold text-rotary-gold-light ring-1 ring-rotary-gold/25"
              >
                {userInitial}
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/50 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-white/70 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-rotary-gold px-4 py-1.5 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-gold)] transition-colors duration-150 hover:bg-rotary-gold-light"
              >
                Join the network
              </Link>
            </>
          )}
        </div>

        {/* Mobile right side: user initial chip (if authed) + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <div
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rotary-gold/20 text-[13px] font-bold text-rotary-gold-light ring-1 ring-rotary-gold/30"
            >
              {userInitial}
            </div>
          )}
          <MobileNav
            isAuthed={!!user}
            isAdmin={isAdmin}
            canMessage={canMessage}
            unread={unread}
            userInitial={user ? userInitial : undefined}
            userName={user?.name ?? user?.email ?? undefined}
            signOutAction={signOutAction}
          />
        </div>
      </div>
    </header>
  );
}
