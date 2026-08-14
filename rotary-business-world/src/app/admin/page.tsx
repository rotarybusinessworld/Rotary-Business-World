import Link from "next/link";
import { db } from "@/backend/db";
import { getAdminScope } from "@/backend/auth-helpers";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock,
  Globe,
  Store,
  Users,
} from "lucide-react";
import { StatCard } from "@/frontend/admin/stat-card";
import { DataTable, THead, Th, TBody, Row, Td, TableEmpty } from "@/frontend/admin/data-table";
import { PageHeader } from "@/frontend/admin/page-header";
import { Badge } from "@/frontend/ui/badge";
import { buttonVariants } from "@/frontend/ui/button";

export const metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const { managedDistrictId } = await getAdminScope();

  // ── Build scoped filters ──────────────────────────────────────────────────
  // DISTRICT_ADMIN: restrict to their district. MANAGEMENT: no filter.
  const userDistrictWhere = managedDistrictId
    ? { rotaryInfo: { districtId: managedDistrictId } }
    : {};
  const businessDistrictWhere = managedDistrictId
    ? { owner: { rotaryInfo: { districtId: managedDistrictId } } }
    : {};

  // ── Parallel stat queries ─────────────────────────────────────────────────
  const [
    pendingCount,
    pendingListingsCount,
    verifiedCount,
    paidCount,
    businessCount,
    districtCount,
    clubCount,
    recentActivity,
  ] = await Promise.all([
    // Pending queue (paid members waiting for approval)
    db.verificationRequest.count({
      where: {
        status: "PENDING",
        user: { hasPaid: true, ...userDistrictWhere },
      },
    }),
    // Pending listings awaiting moderation
    db.business.count({
      where: { status: "PENDING", ...businessDistrictWhere },
    }),
    // Verified members
    db.user.count({
      where: { status: "VERIFIED", role: "MEMBER", ...userDistrictWhere },
    }),
    // All paid members
    db.user.count({
      where: { hasPaid: true, role: "MEMBER", ...userDistrictWhere },
    }),
    // Approved businesses
    db.business.count({
      where: { status: "APPROVED", ...businessDistrictWhere },
    }),
    // Districts (super-admin only)
    managedDistrictId ? Promise.resolve(null) : db.district.count(),
    // Clubs (super-admin only)
    managedDistrictId
      ? Promise.resolve(null)
      : db.club.count(),
    // Recent verification decisions
    db.verificationRequest.findMany({
      where: {
        status: { in: ["APPROVED", "REJECTED"] },
        user: userDistrictWhere,
      },
      orderBy: { reviewedAt: "desc" },
      take: 5,
      include: {
        user: { include: { profile: true } },
        reviewedBy: { include: { profile: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin console"
        title="Overview"
        description={
          managedDistrictId
            ? "Showing stats for your district."
            : "Platform-wide statistics across all districts."
        }
      />

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard
          icon={Clock}
          value={pendingCount}
          label="Pending approval"
          hint="Paid members awaiting review"
          accent={pendingCount > 0}
        />
        <StatCard
          icon={BadgeCheck}
          value={verifiedCount}
          label="Verified members"
        />
        <StatCard
          icon={Users}
          value={paidCount}
          label="Paid members"
          hint="Including pending"
        />
        <StatCard
          icon={Building2}
          value={businessCount}
          label="Active businesses"
        />
        <StatCard
          icon={Store}
          value={pendingListingsCount}
          label="Listings pending"
          hint="Awaiting moderation"
          accent={pendingListingsCount > 0}
        />
        {/* Super-admin only tiles */}
        {!managedDistrictId && districtCount !== null && (
          <StatCard icon={Globe} value={districtCount} label="Districts" />
        )}
        {!managedDistrictId && clubCount !== null && (
          <StatCard icon={Building2} value={clubCount} label="Clubs" />
        )}
      </div>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/verifications"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Review queue
            {pendingCount > 0 && (
              <span className="ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rotary-gold px-1 text-[10px] font-bold text-navy">
                {pendingCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/listings"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Store className="h-3.5 w-3.5" />
            Listing queue
            {pendingListingsCount > 0 && (
              <span className="ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rotary-gold px-1 text-[10px] font-bold text-navy">
                {pendingListingsCount}
              </span>
            )}
          </Link>
          {!managedDistrictId && (
            <Link
              href="/admin/districts"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Globe className="h-3.5 w-3.5" />
              Manage districts
            </Link>
          )}
        </div>
      </div>

      {/* ── Recent verification activity ─────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent verification activity
          </h2>
          <Link
            href="/admin/verifications"
            className="flex items-center gap-1 text-xs font-medium text-rotary-gold-dark hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <DataTable>
          <THead>
            <Th>Member</Th>
            <Th>Status</Th>
            <Th>Reviewed by</Th>
            <Th>Date</Th>
          </THead>
          <TBody>
            {recentActivity.length === 0 ? (
              <TableEmpty message="No verification decisions yet." />
            ) : (
              recentActivity.map((r) => (
                <Row key={r.id}>
                  <Td>
                    <div>
                      <p className="font-medium text-foreground">
                        {r.user.profile?.fullName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.user.email}</p>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={r.status === "APPROVED" ? "verified" : "default"}>
                      {r.status === "APPROVED" ? (
                        <><BadgeCheck className="h-3 w-3" /> Approved</>
                      ) : (
                        "Rejected"
                      )}
                    </Badge>
                  </Td>
                  <Td className="text-muted-foreground">
                    {r.reviewedBy?.profile?.fullName ?? "—"}
                  </Td>
                  <Td className="text-muted-foreground">
                    {r.reviewedAt
                      ? new Date(r.reviewedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </Td>
                </Row>
              ))
            )}
          </TBody>
        </DataTable>
      </div>
    </div>
  );
}
