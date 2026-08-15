import Link from "next/link";
import { BusinessForm } from "@/frontend/dashboard/business-form";
import { Card, CardContent } from "@/frontend/ui/card";
import { requireVerified } from "@/backend/auth-helpers";
import { loadTaxonomy } from "@/backend/taxonomy";
import { createBusiness } from "@/backend/actions/business";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Add business" };

export default async function NewBusinessPage() {
  await requireVerified();
  const taxonomy = await loadTaxonomy();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Your business
        </p>
        <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Add a business
        </h1>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <BusinessForm
              action={createBusiness}
              taxonomy={taxonomy}
              submitLabel="Create business"
            />
          </CardContent>
        </Card>
    </main>
  );
}
