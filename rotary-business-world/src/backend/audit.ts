import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/backend/db";
import { logger } from "@/backend/logger";

/**
 * Append-only audit trail for sensitive actions (money, verification, admin).
 *
 * Two entry points so callers can choose atomicity:
 *  - `auditCreate(client, entry)` returns the create op (a PrismaPromise). Push
 *    it into an existing `db.$transaction([...])` array, or pass a transaction
 *    client, so the audit row commits atomically with the action it records.
 *  - `recordAudit(entry)` is fire-and-forget: it swallows+logs its own errors so
 *    a failed audit write can never break the underlying operation.
 */

/** Either the base client or an interactive-transaction client. */
export type AuditWriter = PrismaClient | Prisma.TransactionClient;

export type AuditEntry = {
  /** The user who acted; null for system events (e.g. the Stripe webhook). */
  actorId?: string | null;
  /** Dotted verb, e.g. "payment.completed", "verification.approved". */
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
};

/** Build the audit-row create op. Await it, or push it into a $transaction array. */
export function auditCreate(client: AuditWriter, entry: AuditEntry) {
  return client.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
    },
  });
}

/** Fire-and-forget audit write that must never throw into the caller. */
export async function recordAudit(
  entry: AuditEntry,
  client: AuditWriter = db,
): Promise<void> {
  try {
    await auditCreate(client, entry);
  } catch (err) {
    logger.error({ err, action: entry.action }, "failed to write audit log");
  }
}
