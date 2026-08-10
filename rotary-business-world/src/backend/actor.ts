import "server-only";
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
  status: "PENDING" | "VERIFIED" | "REJECTED" | (string & {});
  role: "MEMBER" | "CLUB_ADMIN" | "SUPER_ADMIN" | (string & {});
};

/** Throws unless the actor has completed roster verification. */
export function assertVerified(actor: Actor | null | undefined): Actor {
  if (!actor) throw new UnauthorizedError();
  if (actor.status !== "VERIFIED") {
    throw new ForbiddenError("Your membership is still being verified");
  }
  return actor;
}

/** Throws unless the actor is a club or super admin. */
export function assertAdmin(actor: Actor | null | undefined): Actor {
  if (!actor) throw new UnauthorizedError();
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "CLUB_ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return actor;
}

/** Throws unless the actor is a super-admin (management account). */
export function assertSuperAdmin(actor: Actor | null | undefined): Actor {
  if (!actor) throw new UnauthorizedError();
  if (actor.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Super-admin access required");
  }
  return actor;
}
