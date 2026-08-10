/** Normalization helpers shared by the roster importer and signup verification. */

/** Uppercase, strip everything but alphanumerics — for comparing Rotary IDs. */
export function normalizeRotaryId(raw: string | null | undefined): string {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Lowercase, collapse whitespace — for comparing names. */
export function normalizeName(raw: string | null | undefined): string {
  return (raw ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Digits (and letters) only — district codes come in as "D-3201", "3201", etc. */
export function normalizeDistrictCode(raw: string | null | undefined): string {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^D/, "");
}
