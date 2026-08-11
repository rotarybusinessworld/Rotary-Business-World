/**
 * Runs once when the server starts (not during `next build`). We use it to
 * validate the environment up front so a misconfigured production deploy fails
 * fast with a clear message instead of 500ing on the first request.
 */
export async function register() {
  // Only the Node.js server runtime — skip the edge runtime (pino needs Node).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { env, assertProductionEnv } = await import("@/backend/env");
  const { logger } = await import("@/backend/logger");

  assertProductionEnv();
  logger.info({ nodeEnv: env.NODE_ENV }, "environment validated");
}
