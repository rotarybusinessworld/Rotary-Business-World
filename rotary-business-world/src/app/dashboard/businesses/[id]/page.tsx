import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/frontend/site-header";
import { BusinessForm } from "@/frontend/dashboard/business-form";
import { Button } from "@/frontend/ui/button";
import { Card, CardContent } from "@/frontend/ui/card";
import { requireVerified } from "@/backend/auth-helpers";
import { loadTaxonomy } from "@/backend/taxonomy";
import { db } from "@/backend/db";
import { updateBusiness, deleteBusiness } from "@/backend/actions/business";
import { ChevronLeft, Trash2 } from "lucide-react";

export const metadata = { title: "Edit business" };

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireVerified();
  const { id } = await params;

  const business = await db.business.findFirst({
    where: { id, ownerId: user.id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!business) notFound();

  const taxonomy = await loadTaxonomy();
  const update = updateBusiness.bind(null, business.id);
  const remove = deleteBusiness.bind(null, business.id);

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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            Edit business
          </h1>
          <form action={remove}>
            <Button type="submit" variant="outline" size="sm">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </form>
        </div>
        <Card>
          <CardContent className="p-6">
            <BusinessForm
              action={update}
              taxonomy={taxonomy}
              submitLabel="Save changes"
              defaults={{
                name: business.name,
                description: business.description,
                industryId: business.industryId,
                categoryId: business.categoryId,
                logoUrl: business.logoUrl,
                coverUrl: business.coverUrl,
                website: business.website,
                email: business.email,
                phone: business.phone,
                whatsapp: business.whatsapp,
                addressLine: business.addressLine,
                city: business.city,
                country: business.country,
                linkedin: business.linkedin,
                instagram: business.instagram,
                gallery: business.images.map((img) => img.url),
                discountPercent: business.discountPercent,
                discountNote: business.discountNote,
              }}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
