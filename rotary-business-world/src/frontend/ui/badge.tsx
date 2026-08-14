import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        verified: "bg-[color-mix(in_srgb,var(--color-success)_14%,white)] text-success",
        gold: "bg-[color-mix(in_srgb,var(--color-rotary-gold)_20%,white)] text-rotary-gold-dark",
        muted: "bg-muted text-muted-foreground",
        destructive: "bg-[color-mix(in_srgb,var(--color-destructive)_14%,white)] text-destructive",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-0.5 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}
