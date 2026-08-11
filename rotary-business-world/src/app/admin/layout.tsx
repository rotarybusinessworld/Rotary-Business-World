import Link from "next/link";
import { SiteHeader } from "@/frontend/site-header";
import { requireAdmin } from "@/backend/auth-helpers";
import { ShieldCheck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  return (
    <>
      <SiteHeader />
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" /> Admin
          </span>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/admin/verifications"
              className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Verification queue
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin/districts"
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Districts &amp; Clubs
              </Link>
            )}
          </nav>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
