import "server-only";

/**
 * Resolve a storage key to a public URL.
 * Use this on the server side; use `toImageSrc` from `@/shared/image` on the client.
 */
export function keyToUrl(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  if (key.startsWith("/")) return key; // already a local dev path
  const host = process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME;
  if (host) return `https://${host}/${key}`;
  return `/uploads/${key}`; // dev fallback
}
