/**
 * Resolve a stored image value (key or legacy URL) to an `<img src>` string.
 *
 * Storage format evolved from full CDN URLs to bare storage keys:
 *   NEW format: bare key   e.g. "logos/abc123.jpg"
 *   OLD format: full URL   e.g. "https://cdn.example.com/logos/abc123.jpg"
 *   DEV format: /path      e.g. "/uploads/logos/abc123.jpg"
 *
 * Rules:
 *   null / empty            → undefined (no src rendered)
 *   starts with "/"        → as-is  (dev local /uploads/…)
 *   starts with "http"     → as-is, but remap origin to current CDN host if different
 *   anything else          → bare key → build "https://{CDN_HOST}/{key}"
 *                            Falls back to "/uploads/{key}" if CDN host not set (dev)
 */
const PUBLIC_HOST = process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME;

export function toImageSrc(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;

  // Dev local path — pass through unchanged.
  if (stored.startsWith("/")) return stored;

  // Legacy absolute URL — serve directly; remap origin if it differs from the
  // current public host so rows written against an older S3 hostname still resolve.
  if (stored.startsWith("http")) {
    try {
      const u = new URL(stored);
      if (PUBLIC_HOST && u.hostname !== PUBLIC_HOST) {
        return `https://${PUBLIC_HOST}${u.pathname}`;
      }
      return stored;
    } catch {
      return stored;
    }
  }

  // Bare storage key (new format) — build URL from CDN host.
  if (PUBLIC_HOST) return `https://${PUBLIC_HOST}/${stored}`;
  return `/uploads/${stored}`; // dev fallback when no CDN configured
}
