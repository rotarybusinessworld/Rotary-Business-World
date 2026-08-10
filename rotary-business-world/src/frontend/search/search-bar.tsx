"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/** Directory search box with debounced typeahead suggestions. */
export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep input in sync when navigating (e.g. facet clicks).
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  // Debounced suggestions.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = (await res.json()) as { label: string }[];
          setSuggestions(data.map((d) => d.label));
        }
      } catch {
        /* ignore */
      }
    }, 180);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(q: string) {
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.delete("page");
    setOpen(false);
    router.push(`/directory?${next.toString()}`);
  }

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-200 focus-within:border-primary/40 focus-within:shadow-[var(--shadow-pop)]"
      >
        <div className="flex flex-1 items-center gap-2 pl-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search businesses, industries, cities…"
            aria-label="Search the directory"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                submit("");
              }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center rounded-full bg-rotary-gold px-5 text-sm font-semibold text-secondary-foreground transition-all duration-200 ease-out hover:-translate-y-px hover:bg-rotary-gold-light"
        >
          Search
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-pop)]">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => {
                  setValue(s);
                  submit(s);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
