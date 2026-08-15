"use server";

import { redirect } from "next/navigation";
import { unstable_update } from "@/backend/auth";
import { requireUser } from "@/backend/auth-helpers";
import { recordDemoPayment } from "@/backend/services/payment";

/**
 * Demo-mode payment: skips Razorpay and marks the current user as paid.
 *
 * Fails CLOSED: only permitted when Razorpay is NOT configured AND we're not
 * in production. Otherwise a deploy that forgot to set RAZORPAY_KEY_ID would
 * let anyone POST this action and get free access. The guard runs server-side
 * (not just in the UI) because every `"use server"` export is a callable endpoint.
 */
export async function demoCompletePayment(_fd: FormData) {
  const user = await requireUser();

  const demoAllowed =
    !process.env.RAZORPAY_KEY_ID?.trim() && process.env.NODE_ENV !== "production";
  if (!demoAllowed) {
    redirect("/onboarding/payment");
  }

  await recordDemoPayment({ userId: user.id, actorId: user.id });
  await unstable_update({ user: { status: "PENDING_VERIFICATION" } });
  redirect("/dashboard");
}
