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
  // Stripe group — optional in dev (unset ⇒ demo mode).
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Email (not yet implemented).
  EMAIL_FROM: z.string().optional(),
  SMTP_URL: z.string().optional(),
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
  return parsed.data;
}

export const env = parseEnv();

/**
 * Production integrations that are strongly recommended but NOT boot-critical.
 * Returns the list of missing ones (empty in non-production) so the caller can
 * log a loud warning WITHOUT aborting startup.
 *
 * These are deliberately not fatal: missing Stripe only 503s the payment routes
 * (demo mode is already refused in production), and missing S3 degrades uploads
 * to local disk. Neither makes the app unsafe or unable to serve pages — so a
 * misconfiguration here should be visible in logs, not a full outage. The truly
 * required vars (DATABASE_URL, AUTH_SECRET) are enforced at parse time above.
 */
export function missingProductionEnv(): string[] {
  if (env.NODE_ENV !== "production") return [];

  const recommended: Array<[keyof Env, string]> = [
    ["AUTH_URL", "AUTH_URL (deployed base URL)"],
    ["STRIPE_SECRET_KEY", "Stripe secret key"],
    ["STRIPE_WEBHOOK_SECRET", "Stripe webhook secret"],
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
