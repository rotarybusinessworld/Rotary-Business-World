import Link from "next/link";
import { auth, signOut } from "@/backend/auth";
import { db } from "@/backend/db";
import { Logo } from "@/frontend/brand/logo";
import { MobileNav } from "@/frontend/mobile-nav";
import { ProfileMenu } from "@/frontend/profile-menu";
import * as messaging from "@/backend/messaging";
import { LayoutDashboard, MessageCircle, Search, ShieldCheck } from "lucide-react";

const navLink =
  "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/65 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "CLUB_ADMIN";
  const isVerified = user?.status === "VERIFIED";
  const canMessage = isVerified;
  const unread = canMessage ? await messaging.countUnread(user) : 0;

  // Fetch profile photo — not on the JWT session, must come from DB
  const profile = user
    ? await db.profile.findUnique({
        where: { userId: user.id },
        select: { photoUrl: true },
      })
    : null;
  const photoUrl = profile?.photoUrl ?? null;
  const displayName = user?.name ?? user?.email ?? "";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-navy/95 backdrop-blur supports-[backdrop-filter]:bg-navy/80">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">

        {/* Logo */}
        <Link
          href="/"
          aria-label="My Rotary Business World home"
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
            <ProfileMenu
              userId={user.id}
              name={displayName}
              email={user.email ?? ""}
              photoUrl={photoUrl}
              isAdmin={isAdmin}
              isVerified={isVerified}
              signOutAction={signOutAction}
            />
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

        {/* Mobile right side: avatar-trigger (opens nav when authed) or hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <MobileNav
            isAuthed={!!user}
            isAdmin={isAdmin}
            isVerified={isVerified}
            canMessage={canMessage}
            unread={unread}
            userId={user?.id}
            userInitial={user ? (displayName).charAt(0).toUpperCase() : undefined}
            userName={displayName || undefined}
            photoUrl={photoUrl}
            signOutAction={signOutAction}
          />
        </div>
      </div>
    </header>
  );
}
