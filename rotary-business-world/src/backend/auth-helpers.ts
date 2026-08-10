import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Require a VERIFIED user; PENDING users are sent to the dashboard. */
export async function requireVerified() {
  const user = await requireUser();
  if (user.status !== "VERIFIED") redirect("/dashboard");
  return user;
}

/** Require an admin (club or super); non-admins are sent to the dashboard. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "CLUB_ADMIN") {
    redirect("/dashboard");
  }
  return user;
}
