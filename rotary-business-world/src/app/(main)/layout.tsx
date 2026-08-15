import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import { SiteHeader } from "@/frontend/site-header";
import { HeaderSkeleton } from "@/frontend/ui/header-skeleton";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (role === "MANAGEMENT" || role === "DISTRICT_ADMIN") redirect("/admin");

  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <SiteHeader />
      </Suspense>
      {children}
    </>
  );
}
