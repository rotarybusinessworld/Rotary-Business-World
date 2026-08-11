import pino from "pino";
import { env } from "@/backend/env";

/**
 * Structured logger (pino → stdout, which Railway captures).
 *
 * Plain JSON on purpose: no pino-pretty transport wired in-process (its worker
 * thread doesn't survive Next's bundling). For readable local logs, pipe the
 * dev server through the CLI: `npm run dev | npx pino-pretty`.
 */
export const logger = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
});
