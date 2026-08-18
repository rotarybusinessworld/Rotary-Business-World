import Link from "next/link";
import { NeedForm } from "@/frontend/needs/need-form";
import { Card, CardContent } from "@/frontend/ui/card";
import { requireVerified } from "@/backend/auth-helpers";
import { loadTaxonomy } from "@/backend/taxonomy";
import { createNeedAction } from "@/backend/actions/needs";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Post a need" };

export default async function NewNeedPage() {
  await requireVerified();
  const taxonomy = await loadTaxonomy();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/dashboard/needs"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> Back to your needs
      </Link>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Post a requirement
      </p>
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
        What are you looking for?
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tell us what you need and we&rsquo;ll notify the verified Rotarian businesses that
        can supply it. Only businesses that match are contacted.
      </p>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <NeedForm action={createNeedAction} taxonomy={taxonomy} />
        </CardContent>
      </Card>
    </main>
  );
}
