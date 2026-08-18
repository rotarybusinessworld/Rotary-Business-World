import { MapPin, MessageCircle, Package, X } from "lucide-react";
import type { LeadDTO } from "@/backend/needs";
import { Badge } from "@/frontend/ui/badge";
import { Button } from "@/frontend/ui/button";
import { TRADE_INTENT_LABELS } from "@/shared/trade";
import { contactBuyerAction, markLeadNotRelevantAction } from "@/backend/actions/needs";
import type { TradeIntent } from "@/shared/validators";

function money(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `₹${min.toLocaleString()}–₹${max.toLocaleString()}`;
  if (min != null) return `From ₹${min.toLocaleString()}`;
  return `Up to ₹${max!.toLocaleString()}`;
}

/**
 * A single lead in the seller's inbox. Server component — the two actions are
 * plain server-action forms. Buyer contact details are never shown; "I can help"
 * routes through messaging. `isNew` highlights leads unseen before this open.
 */
export function LeadCard({ lead, isNew }: { lead: LeadDTO; isNew: boolean }) {
  const budget = money(lead.budgetMin, lead.budgetMax);
  const dismissed = lead.feedback === "NOT_RELEVANT";

  return (
    <div
      className={
        "rounded-[var(--radius)] border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 " +
        (dismissed ? "opacity-60 " : "") +
        (isNew ? "border-rotary-gold/40" : "border-border")
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {isNew && <Badge variant="gold" size="sm">New</Badge>}
        <span className="font-[family-name:var(--font-display)] font-semibold">
          {lead.category}
        </span>
        <Badge variant="muted" size="sm">
          {TRADE_INTENT_LABELS[lead.tradeIntent as TradeIntent]}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {lead.postedAt.toLocaleDateString()}
        </span>
      </div>

      {/* Which of the seller's businesses / offerings this matched */}
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Package className="h-3.5 w-3.5 shrink-0" />
        Matched <span className="font-medium text-foreground">{lead.business.name}</span>
        {lead.offeringTitle ? ` · ${lead.offeringTitle}` : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {lead.buyerDistrict && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {lead.buyerDistrict}
          </span>
        )}
        {lead.quantity && <span>Qty: {lead.quantity}</span>}
        {budget && <span>Budget: {budget}</span>}
      </div>

      {lead.notes && (
        <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground/90">
          {lead.notes}
        </p>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <form action={contactBuyerAction}>
          <input type="hidden" name="matchId" value={lead.id} />
          <Button type="submit" size="sm" variant="gold">
            <MessageCircle className="h-4 w-4" /> I can help
          </Button>
        </form>
        {!dismissed && (
          <form action={markLeadNotRelevantAction.bind(null, lead.id)}>
            <Button type="submit" size="sm" variant="ghost">
              <X className="h-4 w-4" /> Not relevant
            </Button>
          </form>
        )}
        {dismissed && (
          <span className="text-xs text-muted-foreground">Marked not relevant</span>
        )}
      </div>
    </div>
  );
}
