import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const registered = sp.registered === "1";
  const emailLoginEnabled = !!process.env.RESEND_API_KEY;
  return <LoginForm next={next} registered={registered} emailLoginEnabled={emailLoginEnabled} />;
}
