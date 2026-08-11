import type { NextConfig } from "next";

// Allow images served from the S3 bucket's public host. Set
// NEXT_PUBLIC_S3_PUBLIC_HOSTNAME to your bucket URL, CloudFront, or custom domain.
const s3Host = process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME;

const nextConfig: NextConfig = {
  // Keep pino out of the bundle — it resolves worker/transport files at runtime
  // that don't survive bundling. Loaded as a normal Node dependency instead.
  serverExternalPackages: ["pino", "pino-pretty"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      ...(s3Host ? [{ protocol: "https" as const, hostname: s3Host }] : []),
    ],
  },
};

export default nextConfig;
