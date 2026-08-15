import { requireAdmin } from "@/backend/auth-helpers";
import { signOut } from "@/backend/auth";
import { db } from "@/backend/db";
import { AdminShell } from "@/frontend/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const isSuperAdmin = user.role === "MANAGEMENT";

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { fullName: true },
  });
  const userName = profile?.fullName ?? user.email ?? "Admin";
  const roleLabel = isSuperAdmin ? "Management" : "District admin";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      userName={userName}
      roleLabel={roleLabel}
      signOutAction={signOutAction}
    >
      {children}
    </AdminShell>
  );
}
