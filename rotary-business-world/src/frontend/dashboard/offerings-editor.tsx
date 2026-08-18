"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Input, Label, Select } from "@/frontend/ui/input";
import { TRADE_ROLES, type OfferingInput, type TradeRole } from "@/shared/validators";
import { TRADE_ROLE_LABELS } from "@/shared/trade";

const MAX_OFFERINGS = 20;

type Cat = { id: string; name: string; industryId: string; depth?: number };

/** One indented option label so leaf categories read as more specific. */
function catLabel(c: Cat): string {
  const pad = " ".repeat((c.depth ?? 0) * 2);
  return `${pad}${c.name}`;
}

/**
 * "What do you supply?" — the seller catalog editor. Each offering is a leaf
 * category + title + trade roles + recall keywords. Offerings drive Needs/Leads
 * matching and fold into search. Controlled by the parent, which serializes the
 * value into a hidden `offerings` field. See docs/NEEDS-LEADS.md §3.1.
 */
export function OfferingsEditor({
  categories,
  industryId,
  value,
  onChange,
  error,
}: {
  categories: Cat[];
  industryId: string;
  value: OfferingInput[];
  onChange: (next: OfferingInput[]) => void;
  error?: string[];
}) {
  // Prefer categories inside the chosen industry; fall back to all if none picked.
  const pool = industryId
    ? categories.filter((c) => c.industryId === industryId)
    : categories;

  function update(i: number, patch: Partial<OfferingInput>) {
    onChange(value.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    if (value.length >= MAX_OFFERINGS) return;
    onChange([...value, { categoryId: "", title: "", tradeRoles: [], keywords: [] }]);
  }

  return (
    <div className="space-y-4 border-t border-border pt-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          What you supply
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          List the specific products or services you offer. This is how the right
          buyers find you in search — and how you receive relevant leads.
        </p>
      </div>

      {value.length === 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No offerings yet. Add what you supply so buyers can find you.
        </div>
      )}

      <div className="space-y-4">
        {value.map((o, i) => (
          <div
            key={i}
            className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Offering {i + 1}
              </p>
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove offering ${i + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select
                  value={o.categoryId}
                  onChange={(e) => update(i, { categoryId: e.target.value })}
                >
                  <option value="">Select a category…</option>
                  {pool.map((c) => (
                    <option key={c.id} value={c.id}>
                      {catLabel(c)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={o.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="e.g. Radial truck tyres, wholesale"
                  maxLength={160}
                />
              </div>
            </div>

            {/* Trade roles — how you supply THIS offering (multi-select) */}
            <div className="mt-3">
              <Label>How do you supply this?</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {TRADE_ROLES.map((role) => {
                  const on = o.tradeRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        update(i, {
                          tradeRoles: on
                            ? o.tradeRoles.filter((r) => r !== role)
                            : [...o.tradeRoles, role as TradeRole],
                        })
                      }
                      className={
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                        (on
                          ? "border-rotary-gold bg-rotary-gold/15 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30")
                      }
                      aria-pressed={on}
                    >
                      {TRADE_ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keywords */}
            <div className="mt-3">
              <Label>
                Keywords{" "}
                <span className="font-normal text-muted-foreground">
                  (helps buyers find you — press Enter)
                </span>
              </Label>
              <KeywordInput
                value={o.keywords}
                onChange={(kw) => update(i, { keywords: kw })}
              />
            </div>
          </div>
        ))}
      </div>

      {error && error.length > 0 && (
        <p className="text-sm text-destructive">{error[0]}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          disabled={value.length >= MAX_OFFERINGS}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add offering
        </button>
        <span className="text-xs text-muted-foreground">
          {value.length} / {MAX_OFFERINGS}
        </span>
      </div>
    </div>
  );
}

/** Minimal tag input: type + Enter (or comma) to add a chip; × to remove. */
function KeywordInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const t = draft.trim().toLowerCase();
    if (t && !value.includes(t) && value.length < 20) onChange([...value, t]);
    setDraft("");
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-2 py-1.5">
      {value.map((kw) => (
        <span
          key={kw}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
        >
          {kw}
          <button
            type="button"
            onClick={() => onChange(value.filter((k) => k !== kw))}
            aria-label={`Remove ${kw}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? "" : "e.g. offset, packaging, business cards"}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
