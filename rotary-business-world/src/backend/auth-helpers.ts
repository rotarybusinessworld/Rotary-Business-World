import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";

/** Require a logged-in, non-suspended user. Suspended users go to /account/suspended. */
export async function requireUser(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user) {
    const next = callbackUrl ? `?next=${encodeURIComponent(callbackUrl)}` : "";
    redirect(`/login${next}`);
  }
  if (session.user.status === "SUSPENDED") {
    redirect("/account/suspended");
  }
  return session.user;
}

/**
 * Require a user who has completed payment.
 *
 * Pure status check against the JWT — no extra DB read.
 * Paid statuses: PENDING_VERIFICATION (in queue) and VERIFIED.
 * Admins are exempt (they don't pay the membership fee).
 */
export async function requirePaid(callbackUrl?: string) {
  const user = await requireUser(callbackUrl);
  if (user.role === "MANAGEMENT" || user.role === "DISTRICT_ADMIN") return user;
  if (user.status !== "PENDING_VERIFICATION" && user.status !== "VERIFIED") {
    redirect("/onboarding/payment");
  }
  return user;
}

/** Require a VERIFIED user who has paid; unverified users go to dashboard. */
export async function requireVerified(callbackUrl?: string) {
  const user = await requirePaid(callbackUrl);
  if (user.status !== "VERIFIED") redirect("/dashboard");
  return user;
}

/** Require an admin (district or management); non-admins are sent to the dashboard. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "MANAGEMENT" && user.role !== "DISTRICT_ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Require a management account (platform-wide access only).
 */
export async function requireManagement() {
  const user = await requireUser();
  if (user.role !== "MANAGEMENT") {
    redirect(user.role === "DISTRICT_ADMIN" ? "/admin" : "/dashboard");
  }
  return user;
}

export type AdminScope = {
  user: Awaited<ReturnType<typeof requireAdmin>>;
  managedDistrictId: string | null;
};

export async function getAdminScope(): Promise<AdminScope> {
  const user = await requireAdmin();

  if (user.role === "MANAGEMENT") {
    return { user, managedDistrictId: null };
  }

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { managedDistrictId: true },
  });

  const managedDistrictId = record?.managedDistrictId ?? null;
  // Fail closed: a DISTRICT_ADMIN with no district (e.g. district deleted via
  // ON DELETE SET NULL) must NOT fall through to unscoped MANAGEMENT access.
  if (!managedDistrictId) redirect("/dashboard");

  return { user, managedDistrictId };
}
