"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Suggestion } from "@/backend/search/types";

const DEBOUNCE_MS = 180;
const MIN_CHARS = 2;

export interface UseSearchSuggestOptions {
  /** Current input value — hook re-fires when this changes. */
  value: string;
  /** Called when the user selects a suggestion (click or Enter). */
  onSelect: (s: Suggestion) => void;
  /** When set, suggests are scoped to this industry. */
  industry?: string;
}

export interface UseSearchSuggestReturn {
  suggestions: Suggestion[];
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Index of the keyboard-highlighted item (−1 = none). */
  selectedIndex: number;
  /** Wire to the input's onKeyDown to enable arrow-key + Enter + Esc nav. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Shared typeahead hook for all search inputs.
 * Debounces fetches to /api/search/suggest, returns typed Suggestion[] with
 * keyboard navigation state (↑ ↓ Enter Esc).
 */
export function useSearchSuggest({
  value,
  onSelect,
  industry,
}: UseSearchSuggestOptions): UseSearchSuggestReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Keep a ref to onSelect so the keyboard handler never captures a stale version.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Reset selection when the suggestion list changes.
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Debounced fetch.
  useEffect(() => {
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const url = new URL("/api/search/suggest", window.location.origin);
        url.searchParams.set("q", q);
        if (industry) url.searchParams.set("industry", industry);
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = (await res.json()) as Suggestion[];
          setSuggestions(data);
          setOpen(data.length > 0);
        }
      } catch {
        /* ignore network errors silently */
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, industry]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, -1));
          break;
        case "Enter":
          if (selectedIndex >= 0) {
            e.preventDefault();
            onSelectRef.current(suggestions[selectedIndex]);
            setOpen(false);
          }
          break;
        case "Escape":
          setOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [open, suggestions, selectedIndex],
  );

  return { suggestions, open, setOpen, selectedIndex, handleKeyDown };
}
