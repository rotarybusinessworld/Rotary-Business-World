import { requireVerified } from "@/backend/auth-helpers";
import { listLeadsForOwner } from "@/backend/needs";
import { LeadCard } from "@/frontend/needs/lead-card";
import { MarkLeadsViewed } from "@/frontend/needs/mark-leads-viewed";
import { Inbox } from "lucide-react";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const user = await requireVerified();

  // Read-only in render — flag leads unseen before this open. The actual
  // "mark viewed" write happens in <MarkLeadsViewed/> on mount, so route
  // prefetch of the leads link can't clear the badge prematurely.
  const leads = await listLeadsForOwner(user);
  const newIds = new Set(leads.filter((l) => l.viewedAt === null).map((l) => l.id));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      {newIds.size > 0 && <MarkLeadsViewed />}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Leads
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buyers looking for what your businesses supply. Reply through Rotary Business
          World — we never share your contact details until you choose to help.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When a member posts a need that matches what you supply, it appears here.
            Make sure your business lists specific offerings so buyers can find you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} isNew={newIds.has(lead.id)} />
          ))}
        </div>
      )}
    </main>
  );
}
