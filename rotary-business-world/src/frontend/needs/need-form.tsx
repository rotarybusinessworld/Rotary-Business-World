"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Users } from "lucide-react";
import type { NeedFormState } from "@/backend/actions/needs";
import { estimateRecipientsAction } from "@/backend/actions/needs";
import { Button } from "@/frontend/ui/button";
import { Input, Label, Select, Textarea } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";
import { TRADE_INTENTS, SERVICE_REACHES } from "@/shared/validators";
import { TRADE_INTENT_LABELS, SERVICE_REACH_LABELS } from "@/shared/trade";

type Taxonomy = {
  industries: { id: string; name: string }[];
  categories: { id: string; name: string; industryId: string }[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} loadingText="Posting…">
      Post this need
    </Button>
  );
}

export function NeedForm({
  action,
  taxonomy,
}: {
  action: (state: NeedFormState, formData: FormData) => Promise<NeedFormState>;
  taxonomy: Taxonomy;
}) {
  const [state, formAction] = useActionState<NeedFormState, FormData>(action, {});
  const [industryId, setIndustryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tradeIntent, setTradeIntent] = useState<string>("BUY_WHOLESALE");
  const [reachWanted, setReachWanted] = useState<string>("STATE");

  const [estimate, setEstimate] = useState<number | null>(null);
  const [, startEstimate] = useTransition();

  const categories = useMemo(
    () => taxonomy.categories.filter((c) => c.industryId === industryId),
    [taxonomy.categories, industryId],
  );

  // Live recipient estimate — recomputed whenever the three matching inputs change.
  useEffect(() => {
    if (!categoryId) {
      setEstimate(null);
      return;
    }
    const t = setTimeout(() => {
      startEstimate(async () => {
        const n = await estimateRecipientsAction({ categoryId, tradeIntent, reachWanted });
        setEstimate(n);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [categoryId, tradeIntent, reachWanted]);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      {/* ── Category ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select
            id="industry"
            value={industryId}
            onChange={(e) => {
              setIndustryId(e.target.value);
              setCategoryId("");
            }}
          >
            <option value="">Select industry…</option>
            {taxonomy.industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="categoryId">What do you need?</Label>
          <Select
            id="categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!industryId}
          >
            <option value="">
              {industryId ? "Select a category…" : "Select an industry first"}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError messages={state.fieldErrors?.categoryId} />
        </div>
      </div>

      {/* ── Intent (the strongest relevance signal) ───────────────── */}
      <div>
        <Label>What are you looking for?</Label>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {TRADE_INTENTS.map((intent) => {
            const on = tradeIntent === intent;
            return (
              <button
                key={intent}
                type="button"
                onClick={() => setTradeIntent(intent)}
                aria-pressed={on}
                className={
                  "rounded-[var(--radius)] border px-4 py-3 text-left text-sm font-medium transition-colors " +
                  (on
                    ? "border-rotary-gold bg-rotary-gold/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30")
                }
              >
                {TRADE_INTENT_LABELS[intent]}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="tradeIntent" value={tradeIntent} />
      </div>

      {/* ── Reach ─────────────────────────────────────────────────── */}
      <div>
        <Label htmlFor="reachWanted">Where should this go?</Label>
        <Select
          id="reachWanted"
          name="reachWanted"
          value={reachWanted}
          onChange={(e) => setReachWanted(e.target.value)}
        >
          {SERVICE_REACHES.map((r) => (
            <option key={r} value={r}>
              {SERVICE_REACH_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>

      {/* ── Live recipient estimate ───────────────────────────────── */}
      {categoryId && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-muted/50 px-4 py-3 text-sm">
          <Users className="h-4 w-4 shrink-0 text-rotary-gold-dark" />
          {estimate === null ? (
            <span className="text-muted-foreground">Estimating reach…</span>
          ) : estimate === 0 ? (
            <span className="text-muted-foreground">
              No businesses match this yet — try a broader category or wider reach.
            </span>
          ) : (
            <span className="text-muted-foreground">
              About{" "}
              <span className="font-semibold text-foreground">{estimate}</span>{" "}
              {estimate === 1 ? "business" : "businesses"} will see this need.
            </span>
          )}
        </div>
      )}

      {/* ── Details ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="quantity">
            Quantity{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="quantity" name="quantity" placeholder="e.g. 500 units, wholesale, one-off" />
        </div>
        <div>
          <Label htmlFor="budgetMin">
            Budget min{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="budgetMin" name="budgetMin" type="number" min={0} placeholder="₹" />
        </div>
        <div>
          <Label htmlFor="budgetMax">
            Budget max{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="budgetMax" name="budgetMax" type="number" min={0} placeholder="₹" />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">
          Notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="e.g. Needed by month-end, must be BIS certified. Shown to matched businesses."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Notes are shown to matched businesses but never used for matching.
        </p>
      </div>

      {/* ── Urgent ────────────────────────────────────────────────── */}
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="urgent"
          className="h-4 w-4 rounded border-border accent-rotary-gold"
        />
        <span>
          Mark as urgent{" "}
          <span className="text-muted-foreground">(sent immediately, once per week)</span>
        </span>
      </label>

      <div className="border-t border-border pt-5">
        <SubmitButton />
      </div>
    </form>
  );
}
