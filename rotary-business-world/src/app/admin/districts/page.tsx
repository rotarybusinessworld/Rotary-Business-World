import type { Metadata } from "next";
import { Building2, Globe, MapPin, ShieldOff, UserCog } from "lucide-react";
import { requireSuperAdmin } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import * as adminMgmt from "@/backend/services/admin-management";
import { revokeDistrictAdminAction, reassignDistrictAdminAction } from "@/backend/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/ui/card";
import { Button } from "@/frontend/ui/button";
import { Select } from "@/frontend/ui/input";
import { Avatar } from "@/frontend/ui/avatar";
import { Badge } from "@/frontend/ui/badge";
import { DataTable, THead, Th, TBody, Row, Td, TableEmpty } from "@/frontend/admin/data-table";
import { PageHeader } from "@/frontend/admin/page-header";
import { CreateAdminForm } from "./create-admin-form";
import { CreateDistrictForm } from "./create-district-form";
import { CreateClubForm } from "./create-club-form";

export const metadata: Metadata = { title: "Districts & Clubs" };

export default async function DistrictsPage() {
  const user = await requireSuperAdmin();

  const [districts, clubs] = await Promise.all([
    adminMgmt.listDistrictsWithAdmins(user),
    db.club.findMany({
      select: { id: true, name: true, districtId: true, city: true, country: true },
      orderBy: [{ districtId: "asc" }, { name: "asc" }],
    }),
  ]);

  const districtOptions = districts.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    country: d.country,
  }));

  const clubsByDistrict = clubs.reduce<Record<string, typeof clubs>>((acc, c) => {
    (acc[c.districtId] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Management"
        title="Districts & Clubs"
        description="Create districts and clubs, then assign admins to each district."
      />

      {/* ── Create forms ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Add new
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* New district */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                New district
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateDistrictForm />
            </CardContent>
          </Card>

          {/* New club */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                New club
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateClubForm districts={districtOptions} />
            </CardContent>
          </Card>

          {/* New admin */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                New district admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateAdminForm districts={districtOptions} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Districts table ───────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Districts ({districts.length})
        </h2>
        <DataTable>
          <THead>
            <Th>Code</Th>
            <Th>Name</Th>
            <Th>Country</Th>
            <Th>Clubs</Th>
            <Th>Admins</Th>
          </THead>
          <TBody>
            {districts.length === 0 ? (
              <TableEmpty message="No districts yet — create one above." />
            ) : (
              districts.map((d) => {
                const distClubs = clubsByDistrict[d.id] ?? [];
                return (
                  <Row key={d.id}>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {d.code}
                      </span>
                    </Td>
                    <Td className="font-medium text-foreground">{d.name ?? "—"}</Td>
                    <Td className="text-muted-foreground">{d.country ?? "—"}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {distClubs.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          distClubs.slice(0, 3).map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[10px]"
                            >
                              {c.name}
                            </span>
                          ))
                        )}
                        {distClubs.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{distClubs.length - 3} more
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {d.admins.length === 0 ? (
                        <span className="text-xs text-muted-foreground">None assigned</span>
                      ) : (
                        <ul className="space-y-2">
                          {d.admins.map((a) => (
                            <li key={a.id} className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={a.fullName ?? a.email} size={24} />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground">
                                    {a.fullName ?? "—"}
                                  </p>
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {a.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <form
                                  action={reassignDistrictAdminAction}
                                  className="flex items-center gap-1"
                                >
                                  <input type="hidden" name="userId" value={a.id} />
                                  <Select
                                    name="districtId"
                                    defaultValue={d.id}
                                    className="h-7 w-auto text-[11px]"
                                    aria-label="Move to district"
                                  >
                                    {districtOptions.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.code}
                                        {o.name ? ` — ${o.name}` : ""}
                                      </option>
                                    ))}
                                  </Select>
                                  <Button type="submit" variant="outline" size="sm">
                                    Move
                                  </Button>
                                </form>
                                <form action={revokeDistrictAdminAction.bind(null, a.id)}>
                                  <Button type="submit" variant="ghost" size="sm">
                                    <ShieldOff className="h-3.5 w-3.5" />
                                    Revoke
                                  </Button>
                                </form>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Td>
                  </Row>
                );
              })
            )}
          </TBody>
        </DataTable>
      </section>

      {/* ── Clubs table ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          All clubs ({clubs.length})
        </h2>
        <DataTable>
          <THead>
            <Th>Club name</Th>
            <Th>District</Th>
            <Th>City</Th>
            <Th>Country</Th>
          </THead>
          <TBody>
            {clubs.length === 0 ? (
              <TableEmpty message="No clubs yet — create one above." />
            ) : (
              clubs.map((c) => {
                const district = districts.find((d) => d.id === c.districtId);
                return (
                  <Row key={c.id}>
                    <Td className="font-medium text-foreground">{c.name}</Td>
                    <Td>
                      {district ? (
                        <Badge variant="muted" size="sm">
                          {district.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">{c.city ?? "—"}</Td>
                    <Td className="text-muted-foreground">{c.country ?? "—"}</Td>
                  </Row>
                );
              })
            )}
          </TBody>
        </DataTable>
      </section>
    </div>
  );
}
