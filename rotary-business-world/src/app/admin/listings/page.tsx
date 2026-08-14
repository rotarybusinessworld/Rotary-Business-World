import { db } from "@/backend/db";
import { getAdminScope } from "@/backend/auth-helpers";
import { Badge } from "@/frontend/ui/badge";
import { Button } from "@/frontend/ui/button";
import { Avatar } from "@/frontend/ui/avatar";
import { approveListing, rejectListing } from "@/backend/actions/business-moderation";
import { DataTable, THead, Th, TBody, Row, Td, TableEmpty } from "@/frontend/admin/data-table";
import { PageHeader } from "@/frontend/admin/page-header";
import { BadgeCheck, Clock, X } from "lucide-react";

export const metadata = { title: "Listing moderation" };

export default async function ListingsPage() {
  const { managedDistrictId } = await getAdminScope();

  // Scope: DISTRICT_ADMIN sees only their district's listings; MANAGEMENT sees all.
  const districtWhere = managedDistrictId
    ? { owner: { rotaryInfo: { districtId: managedDistrictId } } }
    : {};

  const [pending, recent] = await Promise.all([
    // Pending listings awaiting approval
    db.business.findMany({
      where: { status: "PENDING", ...districtWhere },
      orderBy: { createdAt: "asc" },
      include: {
        owner: {
          include: {
            profile: true,
            rotaryInfo: { select: { districtId: true } },
          },
        },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    // Recently reviewed listings (approved or rejected)
    db.business.findMany({
      where: {
        status: { in: ["APPROVED", "REJECTED"] },
        ...districtWhere,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        owner: { include: { profile: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin · Listings"
        title="Listing moderation"
        description={
          managedDistrictId
            ? "Business listings in your district awaiting review."
            : "Business listings across all districts awaiting review."
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
            <Th>Business</Th>
            <Th>Owner</Th>
            <Th>Category</Th>
            <Th>Location</Th>
            <Th>Submitted</Th>
            <Th className="text-right">Actions</Th>
          </THead>
          <TBody>
            {pending.length === 0 ? (
              <TableEmpty message="No listings waiting for review — queue is clear." />
            ) : (
              pending.map((listing) => {
                const ownerName = listing.owner.profile?.fullName ?? listing.owner.email;
                const thumbnail = listing.images[0]?.url;
                return (
                  <Row key={listing.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        {/* Thumbnail or placeholder */}
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{listing.name}</p>
                          {listing.description && (
                            <p className="truncate text-xs text-muted-foreground max-w-48">
                              {listing.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={ownerName ?? ""} size={24} />
                        <span className="text-sm text-muted-foreground">{ownerName}</span>
                      </div>
                    </Td>
                    <Td className="text-muted-foreground">
                      {listing.categoryName ?? listing.industryName ?? "—"}
                    </Td>
                    <Td className="text-muted-foreground">
                      {[listing.city, listing.country].filter(Boolean).join(", ") || "—"}
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {new Date(listing.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <form action={rejectListing.bind(null, listing.id)}>
                          <Button type="submit" variant="outline" size="sm">
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </form>
                        <form action={approveListing.bind(null, listing.id)}>
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

      {/* ── Recently reviewed listings ─────────────────────────────── */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recently reviewed
          </h2>
          <DataTable>
            <THead>
              <Th>Business</Th>
              <Th>Owner</Th>
              <Th>Status</Th>
              <Th>Last updated</Th>
            </THead>
            <TBody>
              {recent.map((listing) => {
                const ownerName =
                  listing.owner.profile?.fullName ?? listing.owner.email ?? "—";
                return (
                  <Row key={listing.id}>
                    <Td>
                      <p className="font-medium text-foreground">{listing.name}</p>
                    </Td>
                    <Td className="text-muted-foreground">{ownerName}</Td>
                    <Td>
                      <Badge variant={listing.status === "APPROVED" ? "verified" : "muted"}>
                        {listing.status === "APPROVED" ? (
                          <><BadgeCheck className="h-3 w-3" /> Approved</>
                        ) : (
                          "Rejected"
                        )}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {new Date(listing.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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
