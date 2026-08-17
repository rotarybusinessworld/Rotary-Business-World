import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Allow images served from the S3 bucket's public host. Set
// NEXT_PUBLIC_S3_PUBLIC_HOSTNAME to your bucket URL, CloudFront, or custom domain.
const s3Host = process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME;

const nextConfig: NextConfig = {
  // Keep pino out of the bundle — it resolves worker/transport files at runtime
  // that don't survive bundling. Loaded as a normal Node dependency instead.
  serverExternalPackages: ["pino", "pino-pretty", "@node-rs/bcrypt"],
  images: {
    // Keep the Next.js image optimizer disabled. The app serves all S3 images
    // through the authenticated proxy at /api/images/[...key] (see route.ts).
    // That proxy uses session cookies — but the optimizer fetches src server-side
    // *without* the user's cookies, which would cause 401s. With `unoptimized`,
    // next/image emits a plain <img> and the browser sends the cookie to the proxy.
    unoptimized: true,
    // remotePatterns below are legacy — images now load through same-origin
    // /api/images/... so these S3 hostnames are no longer directly fetched.
    remotePatterns: [
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      ...(s3Host ? [{ protocol: "https" as const, hostname: s3Host }] : []),
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Silences the Sentry CLI output during build (set to true for debugging).
  silent: true,
  // Source-map upload requires SENTRY_AUTH_TOKEN and SENTRY_ORG/PROJECT env
  // vars to be set in Railway's build environment. Without them, source maps
  // are not uploaded (errors still captured, just without un-minified stacks).
  // See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  webpack: {
    treeshake: {
      // Strip Sentry debug logging from client bundles.
      removeDebugLogging: true,
    },
  },
});
