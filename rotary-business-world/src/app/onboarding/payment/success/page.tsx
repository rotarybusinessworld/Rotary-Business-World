import { redirect } from "next/navigation";
import Link from "next/link";
import Stripe from "stripe";
import { SiteHeader } from "@/frontend/site-header";
import { requireUser } from "@/backend/auth-helpers";
import { markUserPaid } from "@/backend/services/payment";
import { buttonVariants } from "@/frontend/ui/button";
import { BadgeCheck } from "lucide-react";

export const metadata = { title: "Membership activated" };

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const sessionId = sp.session_id;

  // Only a verified Stripe Checkout Session grants access here. The demo path
  // never reaches this page (it redirects straight to /dashboard), so if Stripe
  // isn't configured there is nothing to verify — bounce back rather than
  // marking the user paid (which would be a free-access hole in production).
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !sessionId) {
    redirect("/onboarding/payment");
  }

  const stripe = new Stripe(secret);
  let checkout: Stripe.Checkout.Session | null = null;
  try {
    checkout = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    // Stale, malformed, or tampered session_id — don't 500, just bounce.
    checkout = null;
  }

  if (
    !checkout ||
    checkout.payment_status !== "paid" ||
    checkout.metadata?.userId !== user.id
  ) {
    redirect("/onboarding/payment");
  }

  await markUserPaid(user.id);

  return (
    <>
      <SiteHeader />

      <main className="flex min-h-[calc(100svh-68px)] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mx-auto max-w-md">
          {/* Success icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-navy">
            <BadgeCheck className="h-10 w-10 text-rotary-gold-light" />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rotary-gold-dark">
            Payment confirmed
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Welcome to RBW
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Your membership is now active. Explore the directory, connect with
            Rotarian businesses, and add your own listings.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Go to dashboard
            </Link>
            <Link
              href="/directory"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Browse directory
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
