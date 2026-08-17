import React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/shared/utils";

/** Card-wrapped table with sticky header row and horizontal scroll. */
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border bg-muted/40">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export const Row = React.forwardRef<
  HTMLTableRowElement,
  { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLTableRowElement>
>(({ children, className, ...rest }, ref) => (
  <tr ref={ref} className={cn("transition-colors hover:bg-muted/30", className)} {...rest}>
    {children}
  </tr>
));
Row.displayName = "Row";

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>
  );
}

export function TableEmpty({ message = "Nothing here yet." }: { message?: string }) {
  return (
    <tr>
      <td colSpan={99} className="px-4 py-14 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </td>
    </tr>
  );
}
