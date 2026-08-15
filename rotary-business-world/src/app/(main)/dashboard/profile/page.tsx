import type { Metadata } from "next";
import { Card, CardContent } from "@/frontend/ui/card";
import { ProfileForm } from "@/frontend/dashboard/profile-form";
import { requireVerified } from "@/backend/auth-helpers";
import { db } from "@/backend/db";

export const metadata: Metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const user = await requireVerified("/dashboard/profile");

  const profile = await db.profile.findUnique({ where: { userId: user.id } });

  // Profile is always created at registration; this is a safety net.
  const defaults = {
    fullName: profile?.fullName ?? "",
    photoUrl: profile?.photoUrl,
    bio: profile?.bio,
    phone: profile?.phone,
    whatsapp: profile?.whatsapp,
    city: profile?.city,
    country: profile?.country,
    website: profile?.website,
    linkedin: profile?.linkedin,
    instagram: profile?.instagram,
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Your profile
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
            Edit profile
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your photo and details are visible to verified members across the
            directory.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <ProfileForm profile={defaults} />
          </CardContent>
        </Card>
    </main>
  );
}
