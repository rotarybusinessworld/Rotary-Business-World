import { db } from "@/backend/db";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Join Rotary Business World" };

/** Server component — fetches districts and hands them to the client form. */
export default async function RegisterPage() {
  const districts = await db.district.findMany({
    select: { id: true, code: true, name: true, country: true },
    orderBy: [{ country: "asc" }, { code: "asc" }],
  });

  return <RegisterForm districts={districts} />;
}
