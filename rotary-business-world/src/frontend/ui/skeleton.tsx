import * as React from "react";
import { cn } from "@/shared/utils";

/**
 * Shimmer placeholder for async/empty states. The `.skeleton` shimmer surface
 * and its reduced-motion guard live in `globals.css`.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton rounded-[var(--radius)]", className)}
      {...props}
    />
  );
}
