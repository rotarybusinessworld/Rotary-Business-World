"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, X, Loader2, CheckCheck } from "lucide-react";
import {
  approveVerification,
  rejectVerification,
  bulkApproveVerificationsAction,
} from "@/backend/actions/admin";
import { Badge } from "@/frontend/ui/badge";
import { Button } from "@/frontend/ui/button";
import { Avatar } from "@/frontend/ui/avatar";
import { DataTable, THead, Th, TBody, Row, Td, TableEmpty } from "@/frontend/admin/data-table";

export type VerificationItem = {
  id: string;
  name: string;
  email: string;
  rotaryId: string | null;
  clubName: string | null;
  districtCode: string | null;
  score: number | null;
  reason: string | null;
  createdAt: string;
};

function MatchBadge({ score, reason }: { score: number | null; reason: string | null }) {
  if (!reason) return <span className="text-muted-foreground">—</span>;
  const pct = score !== null ? Math.round(score * 100) : null;
  const variant =
    pct === null ? "muted" : pct >= 80 ? "verified" : pct >= 50 ? "gold" : "muted";
  return (
    <span className="flex flex-col gap-0.5">
      <Badge variant={variant} size="sm">
        {pct !== null ? `${pct}% match` : "No match"}
      </Badge>
      <span className="text-[10px] text-muted-foreground">{reason}</span>
    </span>
  );
}

function VerificationRow({
  item,
  focused,
  globalIdx,
  onApprove,
  onReject,
  rowRef,
}: {
  item: VerificationItem;
  focused: boolean;
  globalIdx: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  rowRef: (el: HTMLTableRowElement | null) => void;
}) {
  return (
    <Row
      ref={rowRef}
      data-idx={globalIdx}
      className={focused ? "outline outline-2 outline-primary/40 outline-offset-[-1px]" : undefined}
    >
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={item.name} size={32} />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="truncate text-xs text-muted-foreground">{item.email}</p>
          </div>
        </div>
      </Td>
      <Td className="font-mono text-xs text-muted-foreground">{item.rotaryId ?? "—"}</Td>
      <Td className="text-muted-foreground">{item.clubName ?? "—"}</Td>
      <Td className="text-muted-foreground">{item.districtCode ?? "—"}</Td>
      <Td>
        <MatchBadge score={item.score} reason={item.reason} />
      </Td>
      <Td className="text-xs text-muted-foreground">
        {new Date(item.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </Td>
      <Td>
        <div className="flex items-center justify-end gap-2">
          <form action={() => onReject(item.id)}>
            <Button type="submit" variant="outline" size="sm">
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </form>
          <form action={() => onApprove(item.id)}>
            <Button type="submit" variant="gold" size="sm">
              <BadgeCheck className="h-3.5 w-3.5" /> Approve
            </Button>
          </form>
        </div>
      </Td>
    </Row>
  );
}

type Props = {
  highItems: VerificationItem[];
  mediumItems: VerificationItem[];
  lowItems: VerificationItem[];
};

/**
 * Interactive verification queue with 3 confidence buckets, a bulk-approve
 * action for high-confidence items, and keyboard navigation (J/K/A/R).
 */
export function VerificationQueue({ highItems, mediumItems, lowItems }: Props) {
  const allItems = [...highItems, ...mediumItems, ...lowItems];
  const [focusIdx, setFocusIdx] = useState(-1);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Refs so the keydown handler always sees the latest values without
  // re-registering the listener on every state change.
  const focusIdxRef = useRef(focusIdx);
  focusIdxRef.current = focusIdx;
  const allItemsRef = useRef(allItems);
  allItemsRef.current = allItems;

  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approveVerification(id);
      setFocusIdx(-1);
      router.refresh();
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      await rejectVerification(id);
      setFocusIdx(-1);
      router.refresh();
    });
  };

  const handleBulkApprove = () => {
    if (highItems.length === 0) return;
    startTransition(async () => {
      const ids = highItems.map((i) => i.id);
      const { approved, failed } = await bulkApproveVerificationsAction(ids);
      setBulkResult(
        failed.length === 0
          ? `Approved ${approved} member${approved !== 1 ? "s" : ""}.`
          : `Approved ${approved}, ${failed.length} failed.`,
      );
      router.refresh();
    });
  };

  // J/K navigate, A approve, R reject
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      const items = allItemsRef.current;
      const idx = focusIdxRef.current;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setFocusIdx((i) => (i <= 0 ? 0 : i - 1));
      } else if ((e.key === "a" || e.key === "A") && idx >= 0 && idx < items.length) {
        e.preventDefault();
        handleApprove(items[idx].id);
      } else if ((e.key === "r" || e.key === "R") && idx >= 0 && idx < items.length) {
        e.preventDefault();
        handleReject(items[idx].id);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Registered once; current values accessed via refs

  // Scroll focused row into view
  useEffect(() => {
    if (focusIdx >= 0) {
      rowRefs.current[focusIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusIdx]);

  const totalPending = allItems.length;

  const renderSection = (
    label: string,
    items: VerificationItem[],
    startIdx: number,
    headerAction?: React.ReactNode,
  ) => (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}{" "}
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal">
            {items.length}
          </span>
        </h3>
        {headerAction}
      </div>
      <DataTable>
        <THead>
          <Th>Member</Th>
          <Th>Rotary ID</Th>
          <Th>Club</Th>
          <Th>District</Th>
          <Th>Roster match</Th>
          <Th>Submitted</Th>
          <Th className="text-right">Actions</Th>
        </THead>
        <TBody>
          {items.length === 0 ? (
            <TableEmpty message="No members in this group." />
          ) : (
            items.map((item, i) => {
              const globalIdx = startIdx + i;
              return (
                <VerificationRow
                  key={item.id}
                  item={item}
                  focused={focusIdx === globalIdx}
                  globalIdx={globalIdx}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  rowRef={(el) => {
                    rowRefs.current[globalIdx] = el;
                  }}
                />
              );
            })
          )}
        </TBody>
      </DataTable>
    </section>
  );

  if (totalPending === 0) {
    return (
      <DataTable>
        <TBody>
          <TableEmpty message="The queue is clear — no paid members waiting for review." />
        </TBody>
      </DataTable>
    );
  }

  return (
    <div className="space-y-8">
      {/* keyboard hint */}
      <p className="text-xs text-muted-foreground">
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">J</kbd>{" "}
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">K</kbd>{" "}
        navigate &nbsp;·&nbsp;{" "}
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">A</kbd> approve &nbsp;·&nbsp;{" "}
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">R</kbd> reject
      </p>

      {bulkResult && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-success/30 bg-[color-mix(in_srgb,var(--color-success)_8%,white)] px-3 py-2 text-sm text-success">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          {bulkResult}
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Processing…
        </div>
      )}

      {renderSection(
        "High confidence (≥ 75% roster match)",
        highItems,
        0,
        highItems.length > 0 ? (
          <Button
            variant="gold"
            size="sm"
            onClick={handleBulkApprove}
            disabled={isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Approve all {highItems.length}
          </Button>
        ) : null,
      )}

      {renderSection(
        "Medium confidence (40–74%)",
        mediumItems,
        highItems.length,
      )}

      {renderSection(
        "Needs attention (< 40% or no match)",
        lowItems,
        highItems.length + mediumItems.length,
      )}
    </div>
  );
}
