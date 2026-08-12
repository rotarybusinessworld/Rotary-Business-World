"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, MapPin, Search, Tag, X } from "lucide-react";
import { cn } from "@/shared/utils";
import type { Suggestion } from "@/backend/search/types";
import { useSearchSuggest } from "./use-search-suggest";

/** Bold the matched prefix (or the query substring if found) in a label. */
function Highlight({ label, query }: { label: string; query: string }) {
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, idx)}
      <span className="font-semibold text-white">{label.slice(idx, idx + query.length)}</span>
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

/**
 * Dark-surface search pill designed for the navy navbar.
 * Mirrors search-bar.tsx behavior (debounce, typeahead, /directory?q= navigation)
 * but styled for a dark background.
 */
export function NavSearch({
  className,
  autoFocus = false,
  onNavigate,
}: {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [value, setValue] = useState(params.get("q") ?? "");
  const [focused, setFocused] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input in sync when URL params change (e.g. facet clicks on directory page)
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  // Autofocus when requested (mobile overlay)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Global "/" shortcut — focuses the input (ignored when already in a text field)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement).tagName;
      const editable = (e.target as HTMLElement).isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback(
    (suggestion: Suggestion) => {
      const next = new URLSearchParams();
      // Clear q and active filters; set only the relevant dimension.
      switch (suggestion.type) {
        case "business":
          next.set("q", suggestion.label);
          break;
        case "industry":
          next.set("industry", suggestion.label);
          break;
        case "category":
          next.set("category", suggestion.label);
          break;
        case "city":
          next.set("city", suggestion.label);
          break;
      }
      router.push(`/directory?${next.toString()}`);
      onNavigate?.();
    },
    [router, onNavigate],
  );

  const submit = useCallback(
    (q: string) => {
      const next = new URLSearchParams(params.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      next.delete("page");
      router.push(`/directory?${next.toString()}`);
      onNavigate?.();
    },
    [params, router, onNavigate],
  );

  const { suggestions, open, setOpen, selectedIndex, handleKeyDown } =
    useSearchSuggest({ value, onSelect: navigate });

  // Close suggestions on outside pointer
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen]);

  // Group suggestions by type while preserving the relevance-ranked order.
  const grouped = suggestions.reduce<
    { type: Suggestion["type"]; items: Suggestion[] }[]
  >((acc, s) => {
    const existing = acc.find((g) => g.type === s.type);
    if (existing) existing.items.push(s);
    else acc.push({ type: s.type, items: [s] });
    return acc;
  }, []);

  // Flat list offset so selectedIndex maps back correctly.
  let listOffset = 0;

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
          setOpen(false);
        }}
        className={cn(
          "flex items-center gap-0 overflow-hidden rounded-full border transition-all duration-200",
          focused
            ? "border-rotary-gold/50 bg-white/[0.09] shadow-[0_0_0_3px_rgba(201,162,76,0.12)]"
            : "border-white/10 bg-white/[0.06] hover:border-white/20 hover:bg-white/[0.08]",
        )}
      >
        {/* Left: icon + input */}
        <div className="flex flex-1 items-center gap-2 px-4">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              if (value.trim().length >= 2) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Search businesses, cities…"
            aria-label="Search the directory"
            aria-autocomplete="list"
            aria-expanded={open && suggestions.length > 0}
            className="h-9 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
          {/* Clear button */}
          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                submit("");
                setOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            /* "/" hint chip — only when unfocused */
            !focused && (
              <kbd className="hidden select-none items-center rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/25 sm:flex">
                /
              </kbd>
            )
          )}
        </div>

        {/* Gold submit button */}
        <button
          type="submit"
          className="m-1 flex h-7 shrink-0 items-center rounded-full bg-rotary-gold px-4 text-[12px] font-semibold text-secondary-foreground transition-all duration-150 hover:bg-rotary-gold-light active:scale-95"
        >
          Search
        </button>
      </form>

      {/* Suggestions dropdown — grouped by type */}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-[#111a33] shadow-[var(--shadow-pop)]"
        >
          {grouped.map(({ type, items }) => {
            const Icon = TYPE_ICON[type];
            const groupStart = listOffset;
            listOffset += items.length;
            return (
              <li key={type}>
                {/* Group header */}
                <div className="flex items-center gap-1.5 px-4 pb-0.5 pt-2">
                  <Icon className="h-3 w-3 text-white/25" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
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
                          onPointerDown={(e) => {
                            // Prevent blur from firing before click.
                            e.preventDefault();
                          }}
                          onClick={() => navigate(s)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white",
                            flatIdx === selectedIndex &&
                              "bg-white/[0.07] text-white",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
                          <Highlight label={s.label} query={value} />
                          {type !== "business" && (
                            <Building2 className="ml-auto h-3 w-3 shrink-0 text-white/20" aria-hidden />
                          )}
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
