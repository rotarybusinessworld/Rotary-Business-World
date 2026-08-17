import "server-only";
import { db } from "@/backend/db";
import { invalidateActor } from "@/backend/actor";
import { auditCreate } from "@/backend/audit";

/**
 * Write a CREATED payment row when the Razorpay order is first generated.
 *
 * This is the key reconciliation fix: a row exists from the moment the member
 * clicks "Pay", so a lost webhook no longer leaves the DB with no trace of the
 * attempt. settlePayment() updates this row to CAPTURED on confirmation.
 */
export async function createOrderPayment(input: {
  userId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}): Promise<void> {
  await db.payment.create({
    data: {
      userId: input.userId,
      source: "RAZORPAY",
      razorpayOrderId: input.razorpayOrderId,
      amount: input.amount,
      currency: input.currency,
      status: "CREATED",
    },
  });
}

export type SettlePaymentInput = {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  /** The acting user (verify callback); null for the system webhook. */
  actorId?: string | null;
};

/**
 * Settle a Razorpay payment: CREATED → CAPTURED, then advance user status to
 * PENDING_VERIFICATION.
 *
 * Idempotent: if the row is already CAPTURED (duplicate webhook or concurrent
 * verify + webhook), returns { created: false } immediately. Both the status
 * update and the audit row commit in the same transaction.
 *
 * Fallback: if no order row exists (webhook arrived before the order route
 * wrote it — shouldn't happen in normal flow), creates the row on the spot so
 * the payment is never lost.
 *
 * Kept in a `server-only` module — NOT `"use server"` — so it cannot be
 * called as a network-accessible Server Action.
 */
export async function settlePayment(
  input: SettlePaymentInput,
): Promise<{ created: boolean }> {
  const {
    userId,
    razorpayOrderId,
    razorpayPaymentId,
    amount,
    currency,
    actorId = null,
  } = input;

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { razorpayOrderId },
      select: { id: true, status: true },
    });

    if (existing?.status === "CAPTURED") return { created: false };

    if (existing) {
      await tx.payment.update({
        where: { id: existing.id },
        data: {
          status: "CAPTURED",
          razorpayPaymentId,
          amount,
          currency,
          settledAt: new Date(),
        },
      });
    } else {
      // Fallback: no pre-existing order row — create one and settle it immediately.
      await tx.payment.create({
        data: {
          userId,
          source: "RAZORPAY",
          razorpayOrderId,
          razorpayPaymentId,
          amount,
          currency,
          status: "CAPTURED",
          settledAt: new Date(),
        },
      });
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    // Only advance to PENDING_VERIFICATION from pre-payment states. If the user
    // is already PENDING_VERIFICATION or beyond (e.g. approved while a delayed
    // duplicate webhook was in-flight), skip the status update — the payment
    // CAPTURED write above is still recorded for reconciliation.
    if (user && (user.status === "REGISTERED" || user.status === "PAYMENT_PENDING")) {
      await tx.user.update({
        where: { id: userId },
        data: { status: "PENDING_VERIFICATION" },
      });
    }

    await auditCreate(tx, {
      actorId,
      action: "payment.captured",
      targetType: "User",
      targetId: userId,
      metadata: { razorpayOrderId, razorpayPaymentId, amount, currency },
    });

    return { created: true };
  });
  // Always invalidate — the transaction may have changed user status or
  // the payment row. A spurious DEL on an idempotent duplicate is harmless.
  await invalidateActor(userId);
  return result;
}

/**
 * Record a demo payment and advance the user to PENDING_VERIFICATION.
 * Only reachable when Razorpay is not configured and NODE_ENV !== "production".
 * The guard in actions/payment.ts is the enforcement point; this function
 * trusts that the caller has already verified access.
 */
export async function recordDemoPayment(input: {
  userId: string;
  actorId: string;
}): Promise<void> {
  const { userId, actorId } = input;

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        userId,
        source: "DEMO",
        amount: 0,
        currency: "INR",
        status: "CAPTURED",
        settledAt: new Date(),
      },
    });

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (user && (user.status === "REGISTERED" || user.status === "PAYMENT_PENDING")) {
      await tx.user.update({
        where: { id: userId },
        data: { status: "PENDING_VERIFICATION" },
      });
    }

    await auditCreate(tx, {
      actorId,
      action: "payment.demo_completed",
      targetType: "User",
      targetId: userId,
      metadata: { source: "DEMO" },
    });
  });
  await invalidateActor(userId);
}
