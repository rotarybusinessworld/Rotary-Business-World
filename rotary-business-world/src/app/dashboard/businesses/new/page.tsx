import Link from "next/link";
import { SiteHeader } from "@/frontend/site-header";
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
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold">
          Add a business
        </h1>
        <Card>
          <CardContent className="p-6">
            <BusinessForm
              action={createBusiness}
              taxonomy={taxonomy}
              submitLabel="Create business"
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
