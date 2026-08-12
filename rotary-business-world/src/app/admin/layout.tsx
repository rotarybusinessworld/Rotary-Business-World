import { requireAdmin } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import { AdminShell } from "@/frontend/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  // Fetch admin display name for the topbar.
  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { fullName: true },
  });
  const userName = profile?.fullName ?? user.email ?? "Admin";
  const roleLabel = isSuperAdmin ? "Management" : "District admin";

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      userName={userName}
      roleLabel={roleLabel}
    >
      {children}
    </AdminShell>
  );
}
