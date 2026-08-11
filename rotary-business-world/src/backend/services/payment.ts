import "server-only";
import type { PaymentSource } from "@prisma/client";
import { db } from "@/backend/db";
import { auditCreate } from "@/backend/audit";

/**
 * Record a membership payment and grant paid access — the single idempotent
 * entry point behind `User.hasPaid`.
 *
 * This lives in a `server-only` module — NOT a `"use server"` action file — on
 * purpose. Every export of a `"use server"` module becomes a network-callable
 * Server Action; exposing this there would let anyone POST it and grant paid
 * access. Callers must already have proven payment (the Stripe webhook verifies
 * the signature; the success page verifies the Checkout Session; the demo path
 * is refused in production).
 *
 * Idempotent + atomic: the Stripe path dedupes on the unique
 * `stripeCheckoutSessionId` via `createMany({ skipDuplicates })`, so a retried
 * webhook (or the success page racing it) records the payment, flips `hasPaid`
 * and writes the audit row exactly once — all in one transaction.
 */

export type RecordPaymentInput = {
  userId: string;
  source: PaymentSource;
  amount: number; // minor units (cents)
  currency: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
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
    actorId = null,
  } = input;

  return db.$transaction(async (tx) => {
    // skipDuplicates makes this race-safe against concurrent webhook deliveries:
    // the second insert conflicts on the unique session id and is skipped (count 0)
    // instead of throwing and aborting the transaction. count 1 ⇒ we created it.
    const res = await tx.payment.createMany({
      data: [
        {
          userId,
          source,
          amount,
          currency,
          stripeCheckoutSessionId,
          stripePaymentIntentId,
        },
      ],
      skipDuplicates: true,
    });
    const created = res.count === 1;

    // hasPaid is the same value every time; set it inside the txn so access and
    // the payment record commit together.
    await tx.user.update({ where: { id: userId }, data: { hasPaid: true } });

    if (created) {
      await auditCreate(tx, {
        actorId,
        action: "payment.completed",
        targetType: "User",
        targetId: userId,
        metadata: { source, amount, currency, stripeCheckoutSessionId },
      });
    }

    return { created };
  });
}
