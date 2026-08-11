import type { Metadata } from "next";
import { MapPin, ShieldOff, UserCog } from "lucide-react";
import { requireSuperAdmin } from "@/backend/auth-helpers";
import * as adminMgmt from "@/backend/services/admin-management";
import {
  revokeDistrictAdminAction,
  reassignDistrictAdminAction,
} from "@/backend/actions/admin";
import { Card, CardContent } from "@/frontend/ui/card";
import { Button } from "@/frontend/ui/button";
import { Select } from "@/frontend/ui/input";
import { CreateAdminForm } from "./create-admin-form";

export const metadata: Metadata = { title: "District admins" };

export default async function DistrictsPage() {
  const user = await requireSuperAdmin();
  const districts = await adminMgmt.listDistrictsWithAdmins(user);

  const districtOptions = districts.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    country: d.country,
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Management
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          District admins
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage the admins who verify members in each district.
        </p>
      </div>

      {/* Create */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <UserCog className="h-5 w-5 text-primary" />
            New district admin
          </h2>
          <CreateAdminForm districts={districtOptions} />
        </CardContent>
      </Card>

      {/* Overview */}
      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Districts
        </h2>

        {districts.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-semibold">District {d.code}</span>
                {d.name && (
                  <span className="text-sm text-muted-foreground">· {d.name}</span>
                )}
                {d.country && (
                  <span className="text-sm text-muted-foreground">· {d.country}</span>
                )}
              </div>

              {d.admins.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No admin assigned yet.
                </p>
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
                        {/* Reassign to another district */}
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

                        {/* Revoke */}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
