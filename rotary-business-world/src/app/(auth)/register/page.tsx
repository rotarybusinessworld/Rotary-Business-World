import { db } from "@/backend/db";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Join My Rotary Business World" };

// Render on demand, not at build time: this page queries the DB for districts,
// and the database is not reachable during the Railway build step (the private
// network postgres.railway.internal only exists at runtime). Prerendering it
// would crash the build.
export const dynamic = "force-dynamic";

/** Server component — fetches districts + clubs and hands them to the client form. */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const googleEmail = sp.hint === "google" && typeof sp.email === "string" ? sp.email : undefined;

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

  return <RegisterForm districts={districts} clubs={clubs} googleEmail={googleEmail} />;
}
