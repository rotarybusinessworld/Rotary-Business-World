import { db } from "@/backend/db";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Join Rotary Business World" };

// Render on demand, not at build time: this page queries the DB for districts,
// and the database is not reachable during the Railway build step (the private
// network postgres.railway.internal only exists at runtime). Prerendering it
// would crash the build.
export const dynamic = "force-dynamic";

/** Server component — fetches districts and hands them to the client form. */
export default async function RegisterPage() {
  const districts = await db.district.findMany({
    select: { id: true, code: true, name: true, country: true },
    orderBy: [{ country: "asc" }, { code: "asc" }],
  });

  return <RegisterForm districts={districts} />;
}
