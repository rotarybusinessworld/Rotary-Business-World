import Link from "next/link";
import { auth, signOut } from "@/backend/auth";
import { Logo } from "@/frontend/brand/logo";
import { MobileNav } from "@/frontend/mobile-nav";
import { LayoutDashboard, Search, ShieldCheck } from "lucide-react";

const navLink =
  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white hover:bg-white/5";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "CLUB_ADMIN";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rotary-gold/15 bg-navy/95 backdrop-blur supports-[backdrop-filter]:bg-navy/80">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Rotary Business World home">
          <Logo tone="light" />
        </Link>

        <MobileNav
          isAuthed={!!user}
          isAdmin={isAdmin}
          signOutAction={signOutAction}
        />

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/directory" className={navLink}>
            <Search className="h-4 w-4" />
            Directory
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className={navLink}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              {(user.role === "SUPER_ADMIN" || user.role === "CLUB_ADMIN") && (
                <Link href="/admin/verifications" className={navLink}>
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="ml-1 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
              <Link
                href="/register"
                className="ml-1 inline-flex items-center rounded-full bg-rotary-gold px-4 py-2 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-gold)] transition-colors hover:bg-rotary-gold-light"
              >
                Join the network
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
