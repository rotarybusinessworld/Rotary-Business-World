import { db } from "@/backend/db";
import { getAdminScope } from "@/backend/auth-helpers";
import { Badge } from "@/frontend/ui/badge";
import { DataTable, THead, Th, TBody, Row, Td } from "@/frontend/admin/data-table";
import { PageHeader } from "@/frontend/admin/page-header";
import { Avatar } from "@/frontend/ui/avatar";
import {
  VerificationQueue,
  type VerificationItem,
} from "@/frontend/admin/verification-queue";
import { BadgeCheck, Clock } from "lucide-react";

export const metadata = { title: "Verification queue" };

type SubmittedInfo = {
  rotaryId?: string;
  clubName?: string;
  districtCode?: string;
  score?: number;
  reason?: string;
};

function bucket(score: number | null | undefined): "HIGH" | "MEDIUM" | "LOW" {
  if (score == null || score < 0.4) return "LOW";
  if (score >= 0.75) return "HIGH";
  return "MEDIUM";
}

export default async function VerificationsPage() {
  const { managedDistrictId } = await getAdminScope();

  const pendingUserFilter = {
    status: "PENDING_VERIFICATION" as const,
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

  // Serialize into the plain VerificationItem type the client component accepts.
  // Dates must be strings — Date objects can't cross the server→client boundary.
  const items: VerificationItem[] = pending.map((req) => {
    const info = (req.submittedInfo ?? {}) as SubmittedInfo;
    return {
      id: req.id,
      name: req.user.profile?.fullName ?? "Unknown",
      email: req.user.email ?? "",
      rotaryId: info.rotaryId ?? null,
      clubName: info.clubName ?? null,
      districtCode: info.districtCode ?? null,
      score: info.score ?? null,
      reason: info.reason ?? null,
      createdAt: req.createdAt.toISOString(),
    };
  });

  const highItems = items.filter((i) => bucket(i.score) === "HIGH");
  const mediumItems = items.filter((i) => bucket(i.score) === "MEDIUM");
  const lowItems = items.filter((i) => bucket(i.score) === "LOW");

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

      {/* ── Pending queue — client component for keyboard nav + bulk approve ── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Awaiting review
        </h2>
        <VerificationQueue
          highItems={highItems}
          mediumItems={mediumItems}
          lowItems={lowItems}
        />
      </section>

      {/* ── Recently reviewed ─────────────────────────────────────────────── */}
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
                          <>
                            <BadgeCheck className="h-3 w-3" /> Approved
                          </>
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
