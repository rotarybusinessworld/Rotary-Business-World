/**
 * Typed domain errors thrown by `src/server/services/*`.
 *
 * Services are transport-agnostic: they never redirect and never build a
 * `NextResponse`. They throw one of these instead, and each adapter decides how
 * to present it — a server action maps it to form state, a route handler maps
 * `httpStatus` onto a JSON response.
 */

export type FieldErrors = Record<string, string[]>;

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION";

const HTTP_STATUS: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: AppErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }
}

/** No authenticated actor. */
export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in") {
    super("UNAUTHORIZED", message);
  }
}

/** Authenticated, but not allowed to perform this action. */
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that") {
    super("FORBIDDEN", message);
  }
}

/** Record missing, or hidden from this actor (we don't distinguish, by design). */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message);
  }
}

/** Unique-constraint / already-claimed style failures. */
export class ConflictError extends AppError {
  constructor(message: string, fieldErrors?: FieldErrors) {
    super("CONFLICT", message, fieldErrors);
  }
}

/** Input failed domain (not schema) validation. */
export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: FieldErrors) {
    super("VALIDATION", message, fieldErrors);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
