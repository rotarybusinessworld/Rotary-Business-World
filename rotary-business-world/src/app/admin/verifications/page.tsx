import { db } from "@/backend/db";
import { Card, CardContent } from "@/frontend/ui/card";
import { Badge } from "@/frontend/ui/badge";
import { Button } from "@/frontend/ui/button";
import { approveVerification, rejectVerification } from "@/backend/actions/admin";
import { BadgeCheck, Clock, Inbox, X } from "lucide-react";

export const metadata = { title: "Verification queue" };

type SubmittedInfo = {
  rotaryId?: string;
  clubName?: string;
  districtCode?: string;
  score?: number;
  reason?: string;
};

export default async function VerificationsPage() {
  const [pending, recent] = await Promise.all([
    db.verificationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { include: { profile: true } } },
    }),
    db.verificationRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      take: 8,
      include: { user: { include: { profile: true } }, reviewedBy: { include: { profile: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Verification queue
        </h1>
        <Badge variant={pending.length ? "gold" : "muted"}>
          <Clock className="h-3.5 w-3.5" /> {pending.length} pending
        </Badge>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">The queue is clear</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New signups that can’t be auto-verified against the roster will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((req) => {
            const info = (req.submittedInfo ?? {}) as SubmittedInfo;
            return (
              <Card key={req.id}>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {req.user.profile?.fullName ?? "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">{req.user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span><span className="text-muted-foreground">Rotary ID:</span> {info.rotaryId ?? "—"}</span>
                      <span><span className="text-muted-foreground">Club:</span> {info.clubName ?? "—"}</span>
                      <span><span className="text-muted-foreground">District:</span> {info.districtCode ?? "—"}</span>
                    </div>
                    {info.reason && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Auto-match: {info.reason}
                        {typeof info.score === "number" ? ` (score ${info.score.toFixed(2)})` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={rejectVerification.bind(null, req.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </form>
                    <form action={approveVerification.bind(null, req.id)}>
                      <Button type="submit" variant="primary" size="sm">
                        <BadgeCheck className="h-4 w-4" /> Approve
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recently reviewed
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {recent.map((req) => (
                  <li key={req.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="font-medium">
                      {req.user.profile?.fullName ?? req.user.email}
                    </span>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      {req.reviewedBy?.profile?.fullName && (
                        <span className="hidden text-xs sm:inline">
                          by {req.reviewedBy.profile.fullName}
                        </span>
                      )}
                      <Badge variant={req.status === "APPROVED" ? "verified" : "muted"}>
                        {req.status === "APPROVED" ? "Approved" : "Rejected"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
