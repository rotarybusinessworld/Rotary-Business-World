import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/backend/auth";
import { getActor } from "@/backend/actor";

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
 * Always reads live status from the Redis actor cache (300s TTL) so that
 * suspension takes effect within the TTL window rather than waiting for JWT
 * expiry (up to 30 days). Self-heals the JWT when DB is ahead of the token
 * (e.g. Razorpay webhook delivered payment.captured before /verify was called).
 *
 * Admins are exempt — they don't pay the membership fee.
 */
export async function requirePaid(callbackUrl?: string) {
  const user = await requireUser(callbackUrl);
  if (user.role === "MANAGEMENT" || user.role === "DISTRICT_ADMIN") return user;

  const snapshot = await getActor(user.id);
  const liveStatus = snapshot?.status ?? user.status;

  // Re-check suspension from cache — JWT may be stale.
  if (liveStatus === "SUSPENDED") redirect("/account/suspended");
  if (liveStatus === "PENDING_VERIFICATION" || liveStatus === "VERIFIED") {
    if (liveStatus !== user.status) await unstable_update({ user: { status: liveStatus } });
    return { ...user, status: liveStatus };
  }
  if (liveStatus === "REJECTED") redirect("/dashboard");
  if (liveStatus === "REGISTERED") redirect("/onboarding/rotary-profile");
  redirect("/onboarding/payment");
}

/**
 * Require a VERIFIED user who has paid. PENDING_VERIFICATION users may have been
 * approved by an admin since their JWT was last written — re-read the actor cache to
 * detect this and self-heal the JWT so future requests are free.
 *
 * Inlined rather than calling requirePaid() to make ONE getActor() round-trip total.
 * The old pattern called requirePaid() (which called getActor()) then called getActor()
 * again — a redundant Redis hit for the largest cohort at launch (PENDING_VERIFICATION).
 */
export async function requireVerified(callbackUrl?: string) {
  const user = await requireUser(callbackUrl);

  // Admins skip the payment + verification gate.
  if (user.role === "MANAGEMENT" || user.role === "DISTRICT_ADMIN") return user;

  // Fast path — JWT already shows VERIFIED, no actor cache read needed.
  if (user.status === "VERIFIED") return user;

  // One getActor() call covers both the payment gate and the post-approval check.
  const snapshot = await getActor(user.id);
  const liveStatus = snapshot?.status ?? user.status;

  if (liveStatus === "SUSPENDED") redirect("/account/suspended");

  if (liveStatus === "PENDING_VERIFICATION" || liveStatus === "VERIFIED") {
    // Self-heal the JWT when the DB is ahead of the token.
    if (liveStatus !== user.status) await unstable_update({ user: { status: liveStatus } });
    if (liveStatus === "VERIFIED") return { ...user, status: liveStatus };
    redirect("/dashboard"); // PENDING_VERIFICATION — not yet approved
  }

  if (liveStatus === "REJECTED") redirect("/dashboard");
  if (liveStatus === "REGISTERED") redirect("/onboarding/rotary-profile");
  redirect("/onboarding/payment");
}

/**
 * Require an admin (district or management). Reads role AND status from the Redis
 * actor cache (300s TTL, invalidated by revokeDistrictAdmin / suspend actions).
 * On a cache miss the DB is the fallback.
 * Detects both role revocation and suspension within one TTL window.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "MANAGEMENT" && user.role !== "DISTRICT_ADMIN") {
    redirect("/dashboard");
  }

  const snapshot = await getActor(user.id);
  const liveRole = snapshot?.role ?? user.role;
  const liveStatus = snapshot?.status ?? user.status;

  // Check suspension before role — a suspended admin must not access admin routes
  // even if their role is still intact. requireUser() only catches suspension when
  // the JWT already says SUSPENDED (stale up to 30 days without this check).
  if (liveStatus === "SUSPENDED") {
    await unstable_update({ user: { status: "SUSPENDED" } });
    redirect("/account/suspended");
  }

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
 * Reads live status from actor cache to catch suspension within the TTL window
 * rather than waiting for JWT expiry.
 */
export async function requireManagement() {
  const user = await requireUser();
  if (user.role !== "MANAGEMENT") {
    redirect(user.role === "DISTRICT_ADMIN" ? "/admin" : "/dashboard");
  }

  const snapshot = await getActor(user.id);
  const liveStatus = snapshot?.status ?? user.status;
  if (liveStatus === "SUSPENDED") {
    await unstable_update({ user: { status: "SUSPENDED" } });
    redirect("/account/suspended");
  }

  return user;
}

export type AdminScope = {
  user: Awaited<ReturnType<typeof requireAdmin>>;
  managedDistrictId: string | null;
};

export async function getAdminScope(): Promise<AdminScope> {
  // Inline requireAdmin() logic so we make ONE getActor() call and reuse the
  // snapshot for both the liveness role-check and the managedDistrictId lookup.
  const user = await requireUser();
  if (user.role !== "MANAGEMENT" && user.role !== "DISTRICT_ADMIN") {
    redirect("/dashboard");
  }

  const snapshot = await getActor(user.id);
  const liveRole = snapshot?.role ?? user.role;

  if (liveRole !== "MANAGEMENT" && liveRole !== "DISTRICT_ADMIN") {
    await unstable_update({ user: { role: liveRole } });
    redirect("/dashboard");
  }
  if (liveRole !== user.role) {
    await unstable_update({ user: { role: liveRole } });
  }

  const authedUser = { ...user, role: liveRole };

  if (liveRole === "MANAGEMENT") return { user: authedUser, managedDistrictId: null };

  const managedDistrictId = snapshot?.managedDistrictId ?? null;
  // Fail closed: a DISTRICT_ADMIN with no district (e.g. district deleted via
  // ON DELETE SET NULL) must NOT fall through to unscoped MANAGEMENT access.
  // Redirect to /admin/no-district (outside (main)/) to avoid the layout's
  // DISTRICT_ADMIN → /admin redirect creating an infinite loop.
  if (!managedDistrictId) redirect("/admin/no-district");

  return { user: authedUser, managedDistrictId };
}
