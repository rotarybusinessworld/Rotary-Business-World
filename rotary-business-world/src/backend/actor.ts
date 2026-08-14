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
