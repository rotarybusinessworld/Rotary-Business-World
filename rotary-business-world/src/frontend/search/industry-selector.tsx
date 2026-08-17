"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";

export type TaxonomyData = {
  industries: { id: string; name: string }[];
  categories: { id: string; name: string; industryId: string }[];
};

interface IndustrySelectorProps {
  taxonomy: TaxonomyData;
}

export function IndustrySelector({ taxonomy }: IndustrySelectorProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeIndustry = params.get("industry");
  const activeCategory = params.get("category");

  // Auto-expand the active industry when the panel opens.
  useEffect(() => {
    if (open && activeIndustry) {
      const match = taxonomy.industries.find((i) => i.name === activeIndustry);
      if (match) setExpandedId(match.id);
    }
    if (!open) setExpandedId(null);
  }, [open, activeIndustry, taxonomy.industries]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.push(`/directory?${next.toString()}`);
    setOpen(false);
  }

  const triggerLabel = activeCategory ?? activeIndustry ?? "All Categories";
  const isFiltered = Boolean(activeIndustry || activeCategory);

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="industry-selector-panel"
        className={cn(
          "flex items-center gap-1 py-2 pl-3 pr-2 text-sm font-medium transition-colors",
          isFiltered ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className="max-w-[72px] truncate sm:max-w-[130px]">{triggerLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          id="industry-selector-panel"
          role="listbox"
          aria-label="Browse by category"
          className={cn(
            "absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden",
            "rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-pop)]",
          )}
        >
          {/* All categories */}
          <button
            type="button"
            role="option"
            aria-selected={!isFiltered}
            onClick={() => navigate({ industry: null, category: null })}
            className={cn(
              "flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted",
              !isFiltered
                ? "font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All Categories
          </button>
          <div className="border-t border-border" />

          <div className="max-h-72 overflow-y-auto py-1">
            {taxonomy.industries.map((industry) => {
              const cats = taxonomy.categories.filter(
                (c) => c.industryId === industry.id,
              );
              const isExpanded = expandedId === industry.id;
              const isActive = activeIndustry === industry.name && !activeCategory;

              return (
                <div key={industry.id}>
                  <div
                    className={cn(
                      "flex items-center text-sm transition-colors hover:bg-muted",
                      isActive && "border-l-2 border-primary",
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() =>
                        navigate({ industry: industry.name, category: null })
                      }
                      className={cn(
                        "flex-1 py-2 text-left",
                        isActive ? "pl-[14px]" : "pl-4",
                        isActive
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {industry.name}
                    </button>
                    {cats.length > 0 && (
                      <button
                        type="button"
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${industry.name} categories`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : industry.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-150",
                            isExpanded && "rotate-90",
                          )}
                        />
                      </button>
                    )}
                  </div>

                  {isExpanded && cats.length > 0 && (
                    <ul className="ml-4 border-l border-border py-0.5">
                      {cats.map((cat) => {
                        const isCatActive =
                          activeIndustry === industry.name &&
                          activeCategory === cat.name;
                        return (
                          <li key={cat.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isCatActive}
                              onClick={() =>
                                navigate({
                                  industry: industry.name,
                                  category: cat.name,
                                })
                              }
                              className={cn(
                                "flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                                isCatActive
                                  ? "font-semibold text-primary"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {cat.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
