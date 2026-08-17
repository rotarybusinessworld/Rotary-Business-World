import "server-only";
import type { Role, UserStatus } from "@prisma/client";
import { db } from "@/backend/db";
import { redis } from "@/backend/redis";
import { ForbiddenError, UnauthorizedError } from "@/backend/errors";

/**
 * The caller identity a service operates on behalf of.
 *
 * Deliberately not the Auth.js `Session["user"]`: services must not care where
 * the identity came from. A web request derives it from the session cookie; a
 * future mobile/API adapter would derive it from a bearer token and build the
 * same shape.
 */
export type Actor = {
  id: string;
  status:
    | "REGISTERED"
    | "PAYMENT_PENDING"
    | "PENDING_VERIFICATION"
    | "VERIFIED"
    | "REJECTED"
    | "SUSPENDED"
    | (string & {});
  role: "MEMBER" | "DISTRICT_ADMIN" | "MANAGEMENT" | (string & {});
};

/** Throws unless the actor has completed roster verification. */
export function assertVerified(actor: Actor | null | undefined): Actor {
  if (!actor) throw new UnauthorizedError();
  if (actor.status !== "VERIFIED") {
    throw new ForbiddenError("Your membership is still being verified");
  }
  return actor;
}

/** Throws unless the actor is a district or management admin. */
export function assertAdmin(actor: Actor | null | undefined): Actor {
  if (!actor) throw new UnauthorizedError();
  if (actor.role !== "MANAGEMENT" && actor.role !== "DISTRICT_ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return actor;
}

/** Throws unless the actor is a management account (platform-wide access). */
export function assertManagement(actor: Actor | null | undefined): Actor {
  if (!actor) throw new UnauthorizedError();
  if (actor.role !== "MANAGEMENT") {
    throw new ForbiddenError("Management access required");
  }
  return actor;
}

// ── Redis-backed actor cache ──────────────────────────────────────────────────

/**
 * The DB fields that change after sign-in. Cached in Redis so per-request
 * reads don't hit Postgres on every admin or post-payment page load.
 */
export type ActorSnapshot = {
  role: Role;
  status: UserStatus;
  managedDistrictId: string | null;
};

const actorKey = (userId: string) => `actor:${userId}`;
const ACTOR_TTL_SECONDS = 300;

/**
 * Read role/status/managedDistrictId from Redis (fast path) with a DB fallback.
 * Populates the cache on a miss. Returns null if the user doesn't exist.
 * Redis errors are swallowed — the DB is always authoritative.
 */
export async function getActor(userId: string): Promise<ActorSnapshot | null> {
  if (redis) {
    try {
      const cached = await redis.get(actorKey(userId));
      if (cached) return JSON.parse(cached) as ActorSnapshot;
    } catch {
      // Redis unavailable — fall through to DB
    }
  }

  const record = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, managedDistrictId: true },
  });
  if (!record) return null;

  const snapshot: ActorSnapshot = {
    role: record.role,
    status: record.status,
    managedDistrictId: record.managedDistrictId,
  };

  if (redis) {
    try {
      // Unconditional SET EX (no NX flag). With NX, a slow DB-read that races
      // with invalidateActor() can re-populate the cache with stale data after
      // the key was deleted: invalidateActor DELs the key, the slow reader's
      // SET NX succeeds (key is gone), and the stale snapshot is cached for
      // another full TTL. Without NX, any subsequent fresh request overwrites
      // the stale value in milliseconds rather than 300 s.
      await redis.set(actorKey(userId), JSON.stringify(snapshot), "EX", ACTOR_TTL_SECONDS);
    } catch {
      // Best effort — cache miss on next read is safe
    }
  }

  return snapshot;
}

/**
 * Delete the cached actor snapshot after a role/status/managedDistrictId change.
 * Call this immediately after the DB transaction that mutates those fields.
 * Redis errors are swallowed — the entry expires naturally at ACTOR_TTL_SECONDS.
 */
export async function invalidateActor(userId: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(actorKey(userId));
  } catch {
    // Best effort
  }
}
