/**
 * Search query parsing and sanitization helpers.
 *
 * `toPrefixTsquery` produces a `to_tsquery`-compatible string with the last
 * token suffixed with `:*` for as-you-type prefix matching. It sanitizes input
 * so that no malformed tsquery syntax reaches Postgres (bare `to_tsquery`
 * throws on `&`, `|`, `(`, `)` etc.).
 */

/** Trim and collapse internal whitespace. */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Convert a raw user query into a `to_tsquery`-compatible string that:
 * - strips all characters that are not Unicode letters, digits, or whitespace
 *   so no tsquery operators leak through (`&`, `|`, `!`, `(`, `)`, `:`, etc.)
 * - joins tokens with ` & ` (AND — must match all terms)
 * - appends `:*` to the **last** token for as-you-type prefix matching
 *
 * Returns `null` when there are no usable tokens (empty query, pure punctuation,
 * non-Latin scripts that tokenize to nothing under `simple` config, etc.).
 * Callers must skip FTS entirely when this returns null.
 *
 * @example
 * toPrefixTsquery("coffee sho")  // → "coffee & sho:*"
 * toPrefixTsquery("plumb")       // → "plumb:*"
 * toPrefixTsquery("c++")         // → "c:*"
 * toPrefixTsquery("a & b")       // → "a & b:*"   (& stripped → "a b")
 * toPrefixTsquery("()")          // → null
 * toPrefixTsquery("  ")          // → null
 */
export function toPrefixTsquery(raw: string): string | null {
  // Strip everything that is not a Unicode letter, digit, or whitespace.
  const cleaned = raw.replace(/[^\p{L}\p{N}\s]/gu, " ");

  const tokens = cleaned
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return null;

  // Append :* to the last token for prefix / as-you-type matching.
  // All preceding tokens must match exactly (they are already complete words).
  tokens[tokens.length - 1] = tokens[tokens.length - 1] + ":*";
  return tokens.join(" & ");
}
