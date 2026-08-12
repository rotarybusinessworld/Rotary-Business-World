/**
 * Rewrites a stored image URL to a same-origin authenticated proxy path so
 * images are served through `/api/images/[...key]` rather than directly from S3.
 * The S3 bucket is private; the proxy validates the session before streaming the object.
 *
 * Rules:
 *   - null / empty          → undefined (no src rendered)
 *   - already relative      → returned as-is  (covers `/uploads/…` in local dev
 *                             and `/api/images/…` if already transformed)
 *   - absolute S3 / HTTPS   → strips origin, returns `/api/images/<key>`
 *   - unparseable           → returned as-is (defensive)
 */
export function toImageSrc(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;

  // Already a relative path — pass through unchanged.
  if (stored.startsWith("/")) return stored;

  // Absolute URL: extract the path component and route through the proxy.
  try {
    const { pathname } = new URL(stored);
    const key = pathname.replace(/^\//, ""); // strip leading /
    if (!key) return stored;
    return `/api/images/${key}`;
  } catch {
    // Not a parseable URL — return unchanged.
    return stored;
  }
}
