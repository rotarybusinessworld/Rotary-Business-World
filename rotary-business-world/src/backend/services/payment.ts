import "server-only";
import { db } from "@/backend/db";

/**
 * Mark a user as having paid the membership fee.
 *
 * This lives in a `server-only` module — NOT a `"use server"` action file — on
 * purpose. Every export of a `"use server"` module becomes a network-callable
 * Server Action; exposing a bare `markUserPaid(userId)` there would let anyone
 * POST it and grant paid access to any account. Callers here must have already
 * authenticated and verified payment (the Stripe success page verifies the
 * Checkout Session; the webhook verifies the Stripe signature).
 */
export async function markUserPaid(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { hasPaid: true },
  });
}
