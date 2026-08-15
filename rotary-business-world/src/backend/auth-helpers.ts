import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/backend/auth";
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
 * Fast path: JWT shows PENDING_VERIFICATION or VERIFIED → no DB read.
 *
 * Pre-payment states (REGISTERED, PAYMENT_PENDING): re-read DB to handle the
 * webhook-first race — Razorpay can deliver payment.captured before the client
 * POSTs to /api/razorpay/verify (e.g. UPI, closed tab). If DB is ahead of the
 * JWT, self-heal with unstable_update() so this read never fires again.
 *
 * REJECTED: member has already paid and been declined — not redirected to payment.
 * Admins are exempt (they don't pay the membership fee).
 */
export async function requirePaid(callbackUrl?: string) {
  const user = await requireUser(callbackUrl);
  if (user.role === "MANAGEMENT" || user.role === "DISTRICT_ADMIN") return user;

  // Fast path — JWT is already post-payment.
  if (user.status === "PENDING_VERIFICATION" || user.status === "VERIFIED") {
    return user;
  }

  // REJECTED: member has paid and been declined; dashboard shows rejection notice.
  if (user.status === "REJECTED") redirect("/dashboard");

  // Pre-payment JWT (REGISTERED or PAYMENT_PENDING). Check DB in case the webhook
  // already settled the payment before the client called /verify.
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  const liveStatus = record?.status ?? user.status;

  if (liveStatus === "PENDING_VERIFICATION" || liveStatus === "VERIFIED") {
    // DB is ahead of JWT — refresh the token so future requests hit the fast path.
    await unstable_update({ user: { status: liveStatus } });
    return { ...user, status: liveStatus };
  }

  redirect("/onboarding/payment");
}

/**
 * Require a VERIFIED user who has paid. PENDING_VERIFICATION users may have been
 * approved by an admin since their JWT was last written — re-read DB to detect this
 * and self-heal the JWT so future requests are free.
 */
export async function requireVerified(callbackUrl?: string) {
  const user = await requirePaid(callbackUrl);

  // Fast path — JWT already shows VERIFIED.
  if (user.status === "VERIFIED") return user;

  // JWT shows PENDING_VERIFICATION; admin may have approved or rejected since sign-in.
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  const liveStatus = record?.status ?? user.status;

  if (liveStatus === "VERIFIED") {
    await unstable_update({ user: { status: liveStatus } });
    return { ...user, status: liveStatus };
  }

  // Rejected after payment — dashboard will show the rejection notice.
  if (liveStatus === "REJECTED") redirect("/dashboard");

  redirect("/dashboard");
}

/**
 * Require an admin (district or management). Re-reads role from DB on every call
 * to detect revocation — revokeDistrictAdmin() changes the DB but cannot call
 * unstable_update() for the target user's session (no session context in a
 * server-only service). This is the correct interim fix until Redis-backed
 * getActor() (Tier 1 #2) is in place. Admin routes are low-traffic; the DB
 * read cost is acceptable.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "MANAGEMENT" && user.role !== "DISTRICT_ADMIN") {
    redirect("/dashboard");
  }

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const liveRole = record?.role ?? user.role;

  if (liveRole !== "MANAGEMENT" && liveRole !== "DISTRICT_ADMIN") {
    // Role was revoked — refresh the JWT and redirect to member dashboard.
    await unstable_update({ user: { role: liveRole } });
    redirect("/dashboard");
  }

  if (liveRole !== user.role) {
    await unstable_update({ user: { role: liveRole } });
    return { ...user, role: liveRole };
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
  // Redirect to /admin/no-district (outside (main)/) to avoid the layout's
  // DISTRICT_ADMIN → /admin redirect creating an infinite loop.
  if (!managedDistrictId) redirect("/admin/no-district");

  return { user, managedDistrictId };
}
