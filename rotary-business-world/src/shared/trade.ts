import type { TradeRole, TradeIntent, ServiceReach } from "@/shared/validators";

// Human-facing labels for the seller/buyer taxonomy. Kept in the shared layer so
// the business form, directory facets, result cards, the need form and the leads
// inbox all render the same words. See docs/NEEDS-LEADS.md §3.3 / §5.

export const TRADE_ROLE_LABELS: Record<TradeRole, string> = {
  MANUFACTURER: "Manufacturer",
  WHOLESALER: "Wholesaler",
  RETAILER: "Retailer",
  SERVICE_PROVIDER: "Service provider",
};

export const TRADE_ROLE_HINTS: Record<TradeRole, string> = {
  MANUFACTURER: "You make it — OEM, job work or custom production",
  WHOLESALER: "Bulk supply / distribution / trading, for resale",
  RETAILER: "You sell to end users in small quantity",
  SERVICE_PROVIDER: "A professional or technical service",
};

// Buyer-side intent, in plain language (never the enum name). This single answer
// removes more irrelevant recipients than any other field on the need form.
export const TRADE_INTENT_LABELS: Record<TradeIntent, string> = {
  BUY_WHOLESALE: "Buying for resale / in bulk",
  BUY_RETAIL: "Buying for my own use",
  MANUFACTURING: "Getting something made to order",
  HIRE_SERVICE: "Hiring a service",
};

export const SERVICE_REACH_LABELS: Record<ServiceReach, string> = {
  DISTRICT: "My district",
  STATE: "My state",
  NATIONAL: "Anywhere in the country",
  INTERNATIONAL: "Worldwide",
};

export function tradeRoleLabel(role: string): string {
  return TRADE_ROLE_LABELS[role as TradeRole] ?? role;
}
