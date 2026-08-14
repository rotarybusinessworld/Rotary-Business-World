/**
 * Returns a URL suitable for an `<img src>` attribute from a stored image value.
 *
 * Images are served directly from the public CloudFront/CDN distribution —
 * they do NOT route through the app server. The stored value is always the
 * absolute CDN/S3 URL produced at upload time; we just pass it through,
 * optionally remapping the origin to the current public host so that rows
 * written against an older S3 hostname still resolve after a CDN switch.
 *
 * Rules:
 *   - null / empty        → undefined (no src rendered)
 *   - relative path       → returned as-is  (covers `/uploads/…` in local dev)
 *   - absolute URL, same  → returned as-is  (already the CDN URL)
 *   - absolute URL, diff  → origin swapped to NEXT_PUBLIC_S3_PUBLIC_HOSTNAME
 *                           (handles legacy rows pointing at the old S3 host)
 *   - unparseable         → returned as-is (defensive)
 */
const PUBLIC_HOST = process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME;

export function toImageSrc(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;

  // Relative path (local-dev `/uploads/…`) — pass through unchanged.
  if (stored.startsWith("/")) return stored;

  // Absolute URL: serve directly; remap origin if it differs from the current
  // public host so legacy S3-origin rows still resolve via CloudFront.
  try {
    const u = new URL(stored);
    if (PUBLIC_HOST && u.hostname !== PUBLIC_HOST) {
      return `https://${PUBLIC_HOST}${u.pathname}`;
    }
    return stored;
  } catch {
    // Not a parseable URL — return unchanged.
    return stored;
  }
}
