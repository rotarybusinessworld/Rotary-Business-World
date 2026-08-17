"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/shared/utils";

interface IndustryChipsProps {
  industries: { id: string; name: string }[];
}

export function IndustryChips({ industries }: IndustryChipsProps) {
  const router = useRouter();
  const params = useSearchParams();
  const activeIndustry = params.get("industry");

  function handleClick(name: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    if (activeIndustry === name) {
      // Toggle off
      next.delete("industry");
      next.delete("category");
    } else {
      next.set("industry", name);
      next.delete("category");
    }
    router.push(`/directory?${next.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 pt-3 [&::-webkit-scrollbar]:hidden">
      {industries.map((industry) => {
        const isActive = activeIndustry === industry.name;
        return (
          <button
            key={industry.id}
            type="button"
            onClick={() => handleClick(industry.name)}
            className={cn(
              "flex-none rounded-full border px-3.5 py-1 text-xs font-medium whitespace-nowrap transition-all duration-150",
              isActive
                ? "border-rotary-gold bg-rotary-gold text-[#0b1226]"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {industry.name}
          </button>
        );
      })}
    </div>
  );
}
