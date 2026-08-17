/**
 * Runs once when the server starts (not during `next build`). We use it to
 * validate the environment up front so a misconfigured production deploy fails
 * fast with a clear message instead of 500ing on the first request.
 */
export async function register() {
  // Sentry server-side init — runs in both nodejs and edge runtimes.
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
    });
  }

  // Only the Node.js server runtime — skip the edge runtime (pino needs Node).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { env, missingProductionEnv } = await import("@/backend/env");
  const { logger } = await import("@/backend/logger");

  // DATABASE_URL / AUTH_SECRET are already enforced (fatal) when env.ts parses.
  // Recommended integrations (Razorpay/S3/AUTH_URL) are only WARNED about here —
  // a missing image CDN must not take the whole app down.
  const missing = missingProductionEnv();
  if (missing.length > 0) {
    logger.warn(
      { missing },
      "production is missing recommended integrations (Razorpay/S3/AUTH_URL) — payments and/or uploads will be degraded until configured",
    );
  }
  logger.info({ nodeEnv: env.NODE_ENV }, "environment validated");
}
