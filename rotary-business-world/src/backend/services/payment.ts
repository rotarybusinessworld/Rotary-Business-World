import "server-only";
import type { PaymentSource } from "@prisma/client";
import { db } from "@/backend/db";
import { auditCreate } from "@/backend/audit";
import { assertTransition } from "@/backend/state/user-status";

/**
 * Record a membership payment and advance the user to PENDING_VERIFICATION.
 *
 * Single idempotent entry point for all payment paths (Razorpay webhook,
 * success page, demo). Kept in a `server-only` module — NOT `"use server"` —
 * so it cannot be called as a network-accessible Server Action.
 *
 * Idempotent + atomic: dedupes on the unique `razorpayPaymentId` (or
 * `stripeCheckoutSessionId`) via `createMany({ skipDuplicates })`. A retried
 * webhook inserts a duplicate that is silently ignored, leaving the user
 * status and audit log unchanged. Both the payment row and the status update
 * commit in the same transaction.
 */

export type RecordPaymentInput = {
  userId: string;
  source: PaymentSource;
  amount: number; // minor units (paise or cents)
  currency: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  /** The acting user (success/demo); null for the system webhook. */
  actorId?: string | null;
};

export async function recordMembershipPayment(
  input: RecordPaymentInput,
): Promise<{ created: boolean }> {
  const {
    userId,
    source,
    amount,
    currency,
    stripeCheckoutSessionId = null,
    stripePaymentIntentId = null,
    razorpayPaymentId = null,
    razorpayOrderId = null,
    actorId = null,
  } = input;

  return db.$transaction(async (tx) => {
    // skipDuplicates makes this race-safe against concurrent webhook deliveries.
    const res = await tx.payment.createMany({
      data: [
        {
          userId,
          source,
          amount,
          currency,
          stripeCheckoutSessionId,
          stripePaymentIntentId,
          razorpayPaymentId,
          razorpayOrderId,
        },
      ],
      skipDuplicates: true,
    });
    const created = res.count === 1;

    if (created) {
      // First successful processing of this payment — advance user status.
      // assertTransition guards against illegal jumps (e.g. double-processing
      // via a race that slipped through the payment dedup).
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });
      if (user) {
        assertTransition(user.status, "PENDING_VERIFICATION");
        await tx.user.update({
          where: { id: userId },
          data: { status: "PENDING_VERIFICATION" },
        });
      }

      await auditCreate(tx, {
        actorId,
        action: "payment.completed",
        targetType: "User",
        targetId: userId,
        metadata: { source, amount, currency, stripeCheckoutSessionId, razorpayPaymentId },
      });
    }

    return { created };
  });
}
