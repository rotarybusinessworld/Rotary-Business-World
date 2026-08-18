import Link from "next/link";
import { requireVerified } from "@/backend/auth-helpers";
import { listNeedsForMember } from "@/backend/needs";
import { buttonVariants } from "@/frontend/ui/button";
import { Badge } from "@/frontend/ui/badge";
import { TRADE_INTENT_LABELS, SERVICE_REACH_LABELS } from "@/shared/trade";
import { CheckCircle2, PackageSearch, Plus } from "lucide-react";
import type { TradeIntent, ServiceReach } from "@/shared/validators";

export const metadata = { title: "Your needs" };

export default async function NeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string }>;
}) {
  const user = await requireVerified();
  const [needs, sp] = await Promise.all([listNeedsForMember(user), searchParams]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
            Your needs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Post what you need — matched Rotarian businesses are notified.
          </p>
        </div>
        <Link href="/dashboard/needs/new" className={buttonVariants({ variant: "gold" })}>
          <Plus className="h-4 w-4" /> Post a need
        </Link>
      </div>

      {sp.posted === "1" && (
        <div className="mb-5 flex items-center gap-2 rounded-[var(--radius)] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Your need is posted. Matching businesses are being notified now.
        </div>
      )}

      {needs.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-10 text-center">
          <PackageSearch className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No needs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Looking for a supplier or service? Post a need and let the network come to you.
          </p>
          <Link
            href="/dashboard/needs/new"
            className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-5`}
          >
            Post your first need
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {needs.map((n) => (
            <li
              key={n.id}
              className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{n.category}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {TRADE_INTENT_LABELS[n.tradeIntent as TradeIntent]} ·{" "}
                    {SERVICE_REACH_LABELS[n.reachWanted as ServiceReach]}
                    {n.quantity ? ` · ${n.quantity}` : ""}
                  </p>
                </div>
                <Badge variant={n.status === "OPEN" ? "verified" : "muted"} size="sm">
                  {n.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {n.matchCount > 0
                  ? `${n.matchCount} ${n.matchCount === 1 ? "business" : "businesses"} notified`
                  : "Finding matches…"}{" "}
                · {n.createdAt.toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
