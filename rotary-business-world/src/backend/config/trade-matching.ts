// No `import "server-only"` — this map is loaded by the BullMQ worker (plain Node
// runtime) via matching.ts, so it must avoid the server-only guard.
import type { TradeIntent, TradeRole } from "@prisma/client";

/**
 * Buyer intent → acceptable seller trade roles. **Asymmetric on purpose** —
 * see docs/NEEDS-LEADS.md §6.1. A manufacturer selling direct IS a wholesale
 * source, so BUY_WHOLESALE must reach manufacturers too; but a wholesaler with a
 * 500-unit MOQ is useless to a retail buyer, so BUY_RETAIL stays deliberately
 * narrow. The filter is generous; the score (which favours exact-role matches)
 * is what keeps ranking precise.
 *
 * This is business logic that will be tuned — keep it greppable and testable
 * here, never inlined into the matching SQL.
 */
export const INTENT_TO_ROLES: Record<TradeIntent, TradeRole[]> = {
  BUY_WHOLESALE: ["WHOLESALER", "MANUFACTURER"],
  BUY_RETAIL: ["RETAILER"],
  MANUFACTURING: ["MANUFACTURER"],
  HIRE_SERVICE: ["SERVICE_PROVIDER"],
};

/** The seller role that is the *exact* answer to an intent (scored higher). */
export const INTENT_EXACT_ROLE: Record<TradeIntent, TradeRole> = {
  BUY_WHOLESALE: "WHOLESALER",
  BUY_RETAIL: "RETAILER",
  MANUFACTURING: "MANUFACTURER",
  HIRE_SERVICE: "SERVICE_PROVIDER",
};
