import "server-only";
import type { UserStatus } from "@prisma/client";
import { ForbiddenError } from "@/backend/errors";

/**
 * Legal status transitions for a User.
 *
 * Every status write in this codebase goes through assertTransition so
 * illegal jumps are caught at the service layer rather than silently
 * persisted. Each entry is: current state → set of reachable next states.
 *
 * REGISTERED  → PAYMENT_PENDING   (email confirmed — Week 2 / magic-link)
 * PAYMENT_PENDING → PENDING_VERIFICATION  (payment captured)
 * PENDING_VERIFICATION → VERIFIED | REJECTED  (admin decision)
 * VERIFIED    → SUSPENDED         (admin takedown)
 * SUSPENDED   → VERIFIED          (admin lifts suspension)
 */
const VALID_TRANSITIONS = new Map<UserStatus, ReadonlySet<UserStatus>>([
  ["REGISTERED", new Set<UserStatus>(["PAYMENT_PENDING"])],
  ["PAYMENT_PENDING", new Set<UserStatus>(["PENDING_VERIFICATION"])],
  ["PENDING_VERIFICATION", new Set<UserStatus>(["VERIFIED", "REJECTED"])],
  ["VERIFIED", new Set<UserStatus>(["SUSPENDED"])],
  ["SUSPENDED", new Set<UserStatus>(["VERIFIED"])],
]);

export function assertTransition(from: UserStatus, to: UserStatus): void {
  const allowed = VALID_TRANSITIONS.get(from);
  if (!allowed?.has(to)) {
    throw new ForbiddenError(`Illegal status transition: ${from} → ${to}`);
  }
}
