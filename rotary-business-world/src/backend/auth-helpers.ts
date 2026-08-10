import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Require a VERIFIED user; PENDING users are sent to the dashboard. */
export async function requireVerified() {
  const user = await requireUser();
  if (user.status !== "VERIFIED") redirect("/dashboard");
  return user;
}

/** Require an admin (club or super); non-admins are sent to the dashboard. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "CLUB_ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Require a super-admin (management account only).
 * Club admins are redirected to their own admin dashboard.
 */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") {
    // Club admins exist but don't have access to super-admin surfaces.
    redirect(user.role === "CLUB_ADMIN" ? "/admin" : "/dashboard");
  }
  return user;
}

/**
 * Admin scope for the current request.
 *
 * Returns the user + their managed district id (null for SUPER_ADMIN — they see all).
 * Resolves the district from the DB each request so the scope is never stale after
 * a reassignment (role lives in the JWT and needs a re-login to refresh; scope doesn't).
 */
export type AdminScope = {
  user: Awaited<ReturnType<typeof requireAdmin>>;
  /** null → SUPER_ADMIN, sees all districts. non-null → CLUB_ADMIN, scoped to one district. */
  managedDistrictId: string | null;
};

export async function getAdminScope(): Promise<AdminScope> {
  const user = await requireAdmin();

  if (user.role === "SUPER_ADMIN") {
    return { user, managedDistrictId: null };
  }

  // CLUB_ADMIN — look up their assigned district from the DB.
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { managedDistrictId: true },
  });

  return { user, managedDistrictId: record?.managedDistrictId ?? null };
}
