"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/backend/auth-helpers";
import { recordMembershipPayment } from "@/backend/services/payment";

/**
 * Demo-mode payment: skips Stripe and marks the current user as paid.
 *
 * Fails CLOSED: only permitted when Stripe is NOT configured AND we're not in
 * production. Otherwise a deploy that forgot to set STRIPE_SECRET_KEY would let
 * anyone POST this action and get free access. The guard runs server-side (not
 * just in the UI) because every `"use server"` export is a callable endpoint.
 */
export async function demoCompletePayment(_fd: FormData) {
  const user = await requireUser();

  const demoAllowed =
    !process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production";
  if (!demoAllowed) {
    redirect("/onboarding/payment");
  }

  // Mirrors the $50 Stripe line item so demo records look like real ones.
  await recordMembershipPayment({
    userId: user.id,
    source: "DEMO",
    amount: 5000,
    currency: "usd",
    actorId: user.id,
  });
  redirect("/dashboard");
}
