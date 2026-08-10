import Link from "next/link";
import { SiteHeader } from "@/frontend/site-header";
import { requireUser } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import { Card, CardContent } from "@/frontend/ui/card";
import { Badge } from "@/frontend/ui/badge";
import { buttonVariants } from "@/frontend/ui/button";
import { BadgeCheck, Clock, Plus } from "lucide-react";

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: { profile: true, businesses: true },
  });
  if (!user) return null;

  const verified = user.status === "VERIFIED";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
              Welcome, {user.profile?.fullName ?? user.email}
            </h1>
            <div className="mt-1.5">
              {verified ? (
                <Badge variant="verified">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified Rotarian
                </Badge>
              ) : (
                <Badge variant="gold">
                  <Clock className="h-3.5 w-3.5" /> Verification pending
                </Badge>
              )}
            </div>
          </div>
          {verified && (
            <Link
              href="/dashboard/businesses/new"
              className={buttonVariants({ variant: "primary" })}
            >
              <Plus className="h-4 w-4" /> Add business
            </Link>
          )}
        </div>

        {!verified && (
          <Card className="mb-6 border-secondary/40 bg-[color-mix(in_srgb,var(--color-rotary-gold)_8%,white)]">
            <CardContent>
              <h2 className="font-semibold">Your membership is being reviewed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We could not automatically match your details to the Rotary
                roster, so a club administrator will review your account. You can
                browse the directory in the meantime — listing tools unlock once
                you are verified.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
              Your businesses
            </h2>
            {user.businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {verified
                  ? "You have not added any businesses yet."
                  : "You will be able to add businesses once verified."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {user.businesses.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-3">
                    <span className="font-medium">{b.name}</span>
                    <Link
                      href={`/dashboard/businesses/${b.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Manage
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
