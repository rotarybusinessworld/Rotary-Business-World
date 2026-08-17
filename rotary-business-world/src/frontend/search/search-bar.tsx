"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Search, Tag, X } from "lucide-react";
import { cn } from "@/shared/utils";
import type { Suggestion } from "@/backend/search/types";
import { useSearchSuggest } from "./use-search-suggest";
import { IndustrySelector, type TaxonomyData } from "./industry-selector";

/** Bold the matched substring in a suggestion label. */
function Highlight({ label, query }: { label: string; query: string }) {
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, idx)}
      <span className="font-semibold text-foreground">
        {label.slice(idx, idx + query.length)}
      </span>
      {label.slice(idx + query.length)}
    </>
  );
}

const TYPE_ICON: Record<Suggestion["type"], React.ElementType> = {
  business: Search,
  industry: Tag,
  category: Tag,
  city: MapPin,
};

const TYPE_LABEL: Record<Suggestion["type"], string> = {
  business: "Business",
  industry: "Industry",
  category: "Category",
  city: "City",
};

interface SearchBarProps {
  taxonomy: TaxonomyData;
}

/** Directory search box with IndiaMART-style category selector + debounced typeahead. */
export function SearchBar({ taxonomy }: SearchBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [open2, setOpen2] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeIndustry = params.get("industry") ?? undefined;

  // Keep input in sync when navigating (e.g. facet clicks).
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  function navigate(s: Suggestion) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    switch (s.type) {
      case "business":
        next.set("q", s.label);
        break;
      case "industry":
        next.delete("q");
        next.set("industry", s.label);
        break;
      case "category":
        next.delete("q");
        next.set("category", s.label);
        break;
      case "city":
        next.delete("q");
        next.set("city", s.label);
        break;
    }
    router.push(`/directory?${next.toString()}`);
  }

  function submit(q: string) {
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.delete("page");
    router.push(`/directory?${next.toString()}`);
  }

  const { suggestions, open, setOpen, selectedIndex, handleKeyDown } =
    useSearchSuggest({ value, onSelect: navigate, industry: activeIndustry });

  // Merge external open state: open=hook state, open2=local "was focused" state.
  const isOpen = (open || open2) && suggestions.length > 0;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setOpen2(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [setOpen]);

  // Group suggestions by type while preserving relevance order.
  const grouped = suggestions.reduce<
    { type: Suggestion["type"]; items: Suggestion[] }[]
  >((acc, s) => {
    const existing = acc.find((g) => g.type === s.type);
    if (existing) existing.items.push(s);
    else acc.push({ type: s.type, items: [s] });
    return acc;
  }, []);

  let listOffset = 0;

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
          setOpen(false);
          setOpen2(false);
        }}
        className="flex items-center gap-0 rounded-full border border-border bg-card shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-200 focus-within:border-primary/40 focus-within:shadow-[var(--shadow-pop)]"
      >
        {/* ── Left: industry/category selector ─────────────────────── */}
        <IndustrySelector taxonomy={taxonomy} />

        {/* Vertical divider */}
        <div className="h-6 w-px flex-shrink-0 bg-border" />

        {/* ── Middle: text input ────────────────────────────────────── */}
        <div className="flex flex-1 items-center gap-2 px-3">
          <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen2(true);
            }}
            onFocus={() => setOpen2(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeIndustry
                ? `Search in ${activeIndustry}…`
                : "Search businesses, industries, cities…"
            }
            aria-label="Search the directory"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                submit("");
                setOpen(false);
                setOpen2(false);
              }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* ── Right: submit ─────────────────────────────────────────── */}
        <div className="p-1.5 pl-0">
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center rounded-full bg-rotary-gold px-5 text-sm font-semibold text-secondary-foreground transition-all duration-200 ease-out hover:-translate-y-px hover:bg-rotary-gold-light"
          >
            Search
          </button>
        </div>
      </form>

      {/* Suggestions dropdown — grouped by type */}
      {isOpen && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-30 mt-1.5 w-full overflow-hidden rounded-[var(--radius)]",
            "border border-border bg-card shadow-[var(--shadow-pop)]",
          )}
        >
          {grouped.map(({ type, items }) => {
            const Icon = TYPE_ICON[type];
            const groupStart = listOffset;
            listOffset += items.length;
            return (
              <li key={type}>
                <div className="flex items-center gap-1.5 px-4 pb-0.5 pt-2.5">
                  <Icon className="h-3 w-3 text-muted-foreground/50" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {TYPE_LABEL[type]}s
                  </span>
                </div>
                <ul>
                  {items.map((s, i) => {
                    const flatIdx = groupStart + i;
                    return (
                      <li key={s.label} role="option" aria-selected={flatIdx === selectedIndex}>
                        <button
                          type="button"
                          onClick={() => navigate(s)}
                          className={cn(
                            "flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                            flatIdx === selectedIndex && "bg-muted text-foreground",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          <Highlight label={s.label} query={value} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
