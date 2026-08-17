import { redirect } from "next/navigation";
import { requireUser } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import { RotaryProfileForm } from "./rotary-profile-form";

export const metadata = { title: "Complete your Rotary profile" };

export default async function RotaryProfilePage() {
  const user = await requireUser();

  // Only REGISTERED users should be here; everyone else is routed by requirePaid.
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  if (!record || record.status !== "REGISTERED") redirect("/onboarding/payment");

  const [districts, clubs] = await Promise.all([
    db.district.findMany({
      select: { id: true, code: true, name: true, country: true },
      orderBy: [{ country: "asc" }, { code: "asc" }],
    }),
    db.club.findMany({
      select: { id: true, name: true, districtId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <RotaryProfileForm
      districts={districts}
      clubs={clubs}
      googleName={user.name ?? ""}
    />
  );
}
