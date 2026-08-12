"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Shared open-state for the mobile header controls (search + nav menu). Both
 * triggers live in separate components but must be MUTUALLY EXCLUSIVE — opening
 * one closes the other — so there is only ever a single dropdown (and a single
 * backdrop) on screen. Without this, both could open at once (two ✕ buttons)
 * and a click-outside would only dismiss one stacked backdrop at a time.
 */
type Panel = "search" | "menu" | null;

const MobileNavContext = createContext<{
  active: Panel;
  setActive: (panel: Panel) => void;
} | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Panel>(null);
  return (
    <MobileNavContext.Provider value={{ active, setActive }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within a MobileNavProvider");
  }
  return ctx;
}
