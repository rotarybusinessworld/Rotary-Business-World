import { db } from "@/backend/db";
import { getAdminScope } from "@/backend/auth-helpers";
import { Badge } from "@/frontend/ui/badge";
import { Button } from "@/frontend/ui/button";
import { Avatar } from "@/frontend/ui/avatar";
import { approveVerification, rejectVerification } from "@/backend/actions/admin";
import { DataTable, THead, Th, TBody, Row, Td, TableEmpty } from "@/frontend/admin/data-table";
import { PageHeader } from "@/frontend/admin/page-header";
import { BadgeCheck, Clock, X } from "lucide-react";

export const metadata = { title: "Verification queue" };

type SubmittedInfo = {
  rotaryId?: string;
  clubName?: string;
  districtCode?: string;
  score?: number;
  reason?: string;
};

function MatchBadge({ score, reason }: { score?: number; reason?: string }) {
  if (!reason) return <span className="text-muted-foreground">—</span>;
  const pct = typeof score === "number" ? Math.round(score * 100) : null;
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

export default async function VerificationsPage() {
  const { managedDistrictId } = await getAdminScope();

  // Members only appear in the pending queue once they have paid (pillar 1).
  const pendingUserFilter = {
    hasPaid: true,
    ...(managedDistrictId ? { rotaryInfo: { districtId: managedDistrictId } } : {}),
  };
  const districtFilter = managedDistrictId
    ? { user: { rotaryInfo: { districtId: managedDistrictId } } }
    : {};

  const [pending, recent] = await Promise.all([
    db.verificationRequest.findMany({
      where: { status: "PENDING", user: pendingUserFilter },
      orderBy: { createdAt: "asc" },
      include: {
        user: { include: { profile: true, rotaryInfo: { select: { districtId: true } } } },
      },
    }),
    db.verificationRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] }, ...districtFilter },
      orderBy: { reviewedAt: "desc" },
      take: 10,
      include: {
        user: { include: { profile: true } },
        reviewedBy: { include: { profile: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin · Members"
        title="Verification queue"
        description={
          managedDistrictId
            ? "Paid members in your district awaiting identity verification."
            : "Paid members across all districts awaiting verification."
        }
        actions={
          <Badge variant={pending.length > 0 ? "gold" : "muted"}>
            <Clock className="h-3.5 w-3.5" />
            {pending.length} pending
          </Badge>
        }
      />

      {/* ── Pending queue ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Awaiting review
        </h2>
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
            {pending.length === 0 ? (
              <TableEmpty message="The queue is clear — no paid members waiting for review." />
            ) : (
              pending.map((req) => {
                const info = (req.submittedInfo ?? {}) as SubmittedInfo;
                const name = req.user.profile?.fullName ?? "Unknown";
                return (
                  <Row key={req.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {req.user.email}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-muted-foreground">
                      {info.rotaryId ?? "—"}
                    </Td>
                    <Td className="text-muted-foreground">{info.clubName ?? "—"}</Td>
                    <Td className="text-muted-foreground">{info.districtCode ?? "—"}</Td>
                    <Td>
                      <MatchBadge score={info.score} reason={info.reason} />
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <form action={rejectVerification.bind(null, req.id)}>
                          <Button type="submit" variant="outline" size="sm">
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </form>
                        <form action={approveVerification.bind(null, req.id)}>
                          <Button type="submit" variant="gold" size="sm">
                            <BadgeCheck className="h-3.5 w-3.5" /> Approve
                          </Button>
                        </form>
                      </div>
                    </Td>
                  </Row>
                );
              })
            )}
          </TBody>
        </DataTable>
      </section>

      {/* ── Recently reviewed ─────────────────────────────────────── */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recently reviewed
          </h2>
          <DataTable>
            <THead>
              <Th>Member</Th>
              <Th>Decision</Th>
              <Th>Reviewed by</Th>
              <Th>Date</Th>
            </THead>
            <TBody>
              {recent.map((req) => {
                const name = req.user.profile?.fullName ?? req.user.email ?? "—";
                return (
                  <Row key={req.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size={28} />
                        <span className="font-medium text-foreground">{name}</span>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={req.status === "APPROVED" ? "verified" : "default"}>
                        {req.status === "APPROVED" ? (
                          <><BadgeCheck className="h-3 w-3" /> Approved</>
                        ) : (
                          "Rejected"
                        )}
                      </Badge>
                      {req.note && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{req.note}</p>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">
                      {req.reviewedBy?.profile?.fullName ?? "—"}
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {req.reviewedAt
                        ? new Date(req.reviewedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </Td>
                  </Row>
                );
              })}
            </TBody>
          </DataTable>
        </section>
      )}
    </div>
  );
}
