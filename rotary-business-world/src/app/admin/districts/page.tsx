import type { Metadata } from "next";
import { Building2, Globe, MapPin, ShieldOff, UserCog } from "lucide-react";
import { requireSuperAdmin } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import * as adminMgmt from "@/backend/services/admin-management";
import {
  revokeDistrictAdminAction,
  reassignDistrictAdminAction,
} from "@/backend/actions/admin";
import { Card, CardContent } from "@/frontend/ui/card";
import { Button } from "@/frontend/ui/button";
import { Select } from "@/frontend/ui/input";
import { CreateAdminForm } from "./create-admin-form";
import { CreateDistrictForm } from "./create-district-form";
import { CreateClubForm } from "./create-club-form";

export const metadata: Metadata = { title: "District admins" };

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

  // Group clubs by districtId for display in each district card.
  const clubsByDistrict = clubs.reduce<
    Record<string, typeof clubs>
  >((acc, c) => {
    (acc[c.districtId] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Management
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Districts &amp; Clubs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create districts and clubs, then assign admins to each district.
        </p>
      </div>

      {/* ── Create district ──────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <Globe className="h-5 w-5 text-primary" />
            New district
          </h2>
          <CreateDistrictForm />
        </CardContent>
      </Card>

      {/* ── Create club ──────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            New club
          </h2>
          <CreateClubForm districts={districtOptions} />
        </CardContent>
      </Card>

      {/* ── Create district admin ────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <UserCog className="h-5 w-5 text-primary" />
            New district admin
          </h2>
          <CreateAdminForm districts={districtOptions} />
        </CardContent>
      </Card>

      {/* ── District overview ────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Districts ({districts.length})
        </h2>

        {districts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No districts yet. Create one above.
          </p>
        )}

        {districts.map((d) => {
          const distClubs = clubsByDistrict[d.id] ?? [];
          return (
            <Card key={d.id}>
              <CardContent className="p-5 space-y-4">
                {/* District header */}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-semibold">District {d.code}</span>
                  {d.name && (
                    <span className="text-sm text-muted-foreground">· {d.name}</span>
                  )}
                  {d.country && (
                    <span className="text-sm text-muted-foreground">· {d.country}</span>
                  )}
                </div>

                {/* Clubs in this district */}
                {distClubs.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Clubs ({distClubs.length})
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {distClubs.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                        >
                          {c.name}
                          {c.city ? ` · ${c.city}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Admins */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Admins
                  </p>
                  {d.admins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No admin assigned yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {d.admins.map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {a.fullName ?? "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {a.email}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <form
                              action={reassignDistrictAdminAction}
                              className="flex items-center gap-2"
                            >
                              <input type="hidden" name="userId" value={a.id} />
                              <Select
                                name="districtId"
                                defaultValue={d.id}
                                className="h-9 w-auto text-xs"
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
                                <ShieldOff className="h-4 w-4" />
                                Revoke
                              </Button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
