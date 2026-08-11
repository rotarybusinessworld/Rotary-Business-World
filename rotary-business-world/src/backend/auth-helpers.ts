import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";

/** Require a logged-in user; redirect to /login (with optional callbackUrl) otherwise. */
export async function requireUser(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user) {
    const next = callbackUrl ? `?next=${encodeURIComponent(callbackUrl)}` : "";
    redirect(`/login${next}`);
  }
  return session.user;
}

/**
 * Require a logged-in user who has completed the membership payment step.
 * Redirects to /onboarding/payment if the user hasn't paid yet.
 */
export async function requirePaid(callbackUrl?: string) {
  const user = await requireUser(callbackUrl);
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { hasPaid: true },
  });
  if (!record?.hasPaid) redirect("/onboarding/payment");
  return user;
}

/** Require a VERIFIED user who has paid; unverified users go to dashboard. */
export async function requireVerified() {
  const user = await requirePaid();
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
 */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") {
    redirect(user.role === "CLUB_ADMIN" ? "/admin" : "/dashboard");
  }
  return user;
}

export type AdminScope = {
  user: Awaited<ReturnType<typeof requireAdmin>>;
  managedDistrictId: string | null;
};

export async function getAdminScope(): Promise<AdminScope> {
  const user = await requireAdmin();

  if (user.role === "SUPER_ADMIN") {
    return { user, managedDistrictId: null };
  }

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { managedDistrictId: true },
  });

  return { user, managedDistrictId: record?.managedDistrictId ?? null };
}
