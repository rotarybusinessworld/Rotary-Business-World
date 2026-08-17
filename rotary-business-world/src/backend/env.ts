import { z } from "zod";

/**
 * Validated environment. Parsed once at import so a misconfigured deploy fails
 * fast with a clear message instead of throwing a vague 500 on first request.
 *
 * Two layers, on purpose:
 *  - The base schema (below) is the FATAL layer: it enforces what's needed to
 *    boot at all (DATABASE_URL, AUTH_SECRET) plus type/format for everything
 *    else. It runs at *import*, which includes `next build` — so it must NOT
 *    require the production-only integration groups, or local builds without
 *    Stripe/S3 keys would break.
 *  - `missingProductionEnv()` is the ADVISORY layer: it reports missing (but
 *    non-fatal) production integrations — Stripe, S3, AUTH_URL — so
 *    `instrumentation.ts` can log a loud warning at server start WITHOUT aborting
 *    boot. A missing image CDN must not take the whole app down.
 */

const LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

const baseSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // Required to boot.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL").optional(),
  // S3 group — optional in dev (falls back to local disk storage).
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  NEXT_PUBLIC_S3_PUBLIC_HOSTNAME: z.string().optional(),
  // Razorpay group — optional in dev (unset ⇒ demo mode).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_AMOUNT_PAISE: z.string().optional(),
  // Email (Resend — magic-link auth + notifications).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Redis — BullMQ worker queue + actor cache.
  REDIS_URL: z.string().optional(),
  // Sentry — error monitoring. NEXT_PUBLIC so it's available on the client too.
  // DSN is a public endpoint (safe to expose in the browser), not a secret.
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  // Logging.
  LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
});

export type Env = z.infer<typeof baseSchema>;

function parseEnv(): Env {
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${detail}`);
  }

  // S3 and Redis are required in production.
  // S3: Railway's filesystem is ephemeral — uploads vanish on redeploy and aren't
  //     shared across replicas. Fail closed so a missing config is caught at boot.
  // Redis: Required for the actor cache (JWT freshness) and the BullMQ image-
  //     processing pipeline (presigned upload → EXIF strip → final S3 key).
  if (parsed.data.NODE_ENV === "production") {
    const missing = (
      [
        "AWS_REGION",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "S3_BUCKET",
        "REDIS_URL",
      ] as const
    ).filter((k) => !parsed.data[k]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required env vars for production:\n` +
          missing.map((k) => `  - ${k}`).join("\n"),
      );
    }
  }

  return parsed.data;
}

export const env = parseEnv();

/**
 * Production integrations that are strongly recommended but NOT boot-critical.
 * Returns the list of missing ones (empty in non-production) so the caller can
 * log a loud warning WITHOUT aborting startup.
 *
 * These are deliberately not fatal: missing Razorpay only 503s the payment routes
 * (demo mode is already refused in production), and missing S3 degrades uploads
 * to local disk. Neither makes the app unsafe or unable to serve pages — so a
 * misconfiguration here should be visible in logs, not a full outage. The truly
 * required vars (DATABASE_URL, AUTH_SECRET) are enforced at parse time above.
 */
export function missingProductionEnv(): string[] {
  if (env.NODE_ENV !== "production") return [];

  const recommended: Array<[keyof Env, string]> = [
    ["AUTH_URL", "AUTH_URL (deployed base URL)"],
    ["RESEND_API_KEY", "Resend API key (magic-link auth + email)"],
    ["EMAIL_FROM", "EMAIL_FROM (sender address for magic-link emails)"],
    ["REDIS_URL", "Redis URL (actor cache + BullMQ jobs)"],
    ["RAZORPAY_KEY_ID", "Razorpay key ID"],
    ["RAZORPAY_KEY_SECRET", "Razorpay key secret"],
    ["RAZORPAY_WEBHOOK_SECRET", "Razorpay webhook secret"],
    ["AWS_REGION", "AWS region"],
    ["AWS_ACCESS_KEY_ID", "AWS access key id"],
    ["AWS_SECRET_ACCESS_KEY", "AWS secret access key"],
    ["S3_BUCKET", "S3 bucket"],
    ["NEXT_PUBLIC_S3_PUBLIC_HOSTNAME", "S3 public hostname"],
  ];

  return recommended
    .filter(([key]) => !env[key])
    .map(([key, label]) => `${key} (${label})`);
}
