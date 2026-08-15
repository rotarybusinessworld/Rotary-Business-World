import Link from "next/link";
import { auth, signOut } from "@/backend/auth";
import { db } from "@/backend/db";
import { Logo } from "@/frontend/brand/logo";
import { MobileNav } from "@/frontend/mobile-nav";
import { MobileNavProvider } from "@/frontend/mobile-nav-context";
import { ProfileMenu } from "@/frontend/profile-menu";
import { NavSearch } from "@/frontend/search/nav-search";
import { NavSearchMobile } from "@/frontend/search/nav-search-mobile";
import * as messaging from "@/backend/messaging";
import { Compass, LayoutDashboard, MessageCircle, ShieldCheck } from "lucide-react";

const navLink =
  "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "MANAGEMENT" || user?.role === "DISTRICT_ADMIN";
  const isVerified = user?.status === "VERIFIED";
  const canMessage = isVerified && !isAdmin;
  const unread = canMessage ? await messaging.countUnread(user) : 0;

  // Profile photo lives on the Profile model, not the JWT session
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
      {/* Faint gold bottom hairline */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rotary-gold/20 to-transparent"
      />

      {/*
        Three-zone layout: [Logo] [flex-1 NavSearch] [nav links + auth]
        The flex-1 middle zone keeps the search centered between the two clusters.
      */}
      <div className="relative mx-auto flex h-[68px] max-w-6xl items-center gap-3 px-4 sm:px-6">

        {/* ── Zone 1: Logo ─────────────────────────────────── */}
        <Link
          href="/"
          aria-label="Rotary Business World home"
          className="shrink-0"
        >
          <Logo tone="light" size={32} />
        </Link>

        {/* ── Zone 2: Desktop search (centered, flex-1) ────── */}
        <div className="hidden flex-1 md:flex md:px-4">
          <NavSearch className="w-full max-w-xl mx-auto" />
        </div>

        {/*
          ── Zone 3: Right cluster ──────────────────────────
          ml-auto pins it to the right edge on mobile, where Zone 2 (the flex-1
          search) is hidden and no longer pushes this cluster over.
        */}
        <div className="ml-auto flex shrink-0 items-center gap-1">

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {!isAdmin && (
              <Link href="/directory" className={navLink}>
                <Compass className="h-3.5 w-3.5" />
                Directory
              </Link>
            )}
            {user && !isAdmin && (
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

          {/* Divider between nav links and auth — desktop only */}
          {user && (
            <div className="mx-2 hidden h-5 w-px bg-white/10 md:block" aria-hidden />
          )}

          {/* Desktop auth */}
          <div className="hidden md:flex">
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
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-full bg-rotary-gold px-4 py-1.5 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-gold)] transition-colors hover:bg-rotary-gold-light"
                >
                  Join the network
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: search icon + avatar/hamburger trigger.
              Wrapped in one provider so the two dropdowns are mutually exclusive. */}
          <MobileNavProvider>
            <NavSearchMobile />
            <MobileNav
              isAuthed={!!user}
              isAdmin={isAdmin}
              isVerified={isVerified}
              canMessage={canMessage}
              unread={unread}
              userId={user?.id}
              userInitial={user ? displayName.charAt(0).toUpperCase() : undefined}
              userName={displayName || undefined}
              photoUrl={photoUrl}
              signOutAction={signOutAction}
            />
          </MobileNavProvider>
        </div>
      </div>
    </header>
  );
}
