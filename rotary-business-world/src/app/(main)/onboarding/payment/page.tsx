import { redirect } from "next/navigation";
import { PaymentClient } from "./payment-client";
import { requireUser } from "@/backend/auth-helpers";
import { db } from "@/backend/db";
import {
  BadgeCheck,
  Check,
  Globe2,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

export const metadata = { title: "Activate membership" };

const perks = [
  {
    icon: Globe2,
    title: "Global directory access",
    text: "Search verified Rotarian-owned businesses across every industry and continent.",
  },
  {
    icon: BadgeCheck,
    title: "Verified member badge",
    text: "A trust mark on your profile and every listing you publish.",
  },
  {
    icon: Star,
    title: "Unlimited listings",
    text: "List all your businesses and receive referrals from fellow Rotarians.",
  },
  {
    icon: Users,
    title: "A private network",
    text: "An exclusive, Rotary-only community — no public access, ever.",
  },
];

// Reinforcement checklist shown inside the payment card.
const included = [
  "Instant access the moment you pay",
  "Verified against the official Rotary roster",
  "Cancel anytime — no lock-in",
];

export default async function PaymentPage() {
  const user = await requireUser();

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  // Profile not yet complete — must fill in Rotary details first.
  if (record?.status === "REGISTERED") redirect("/onboarding/rotary-profile");
  // Already past the payment step → straight to dashboard.
  if (record && record.status !== "PAYMENT_PENDING") redirect("/dashboard");

  const hasRazorpay = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

  const amountPaise = parseInt(process.env.RAZORPAY_AMOUNT_PAISE ?? "399900", 10);
  const priceDisplay = hasRazorpay
    ? { symbol: "₹", integer: Math.floor(amountPaise / 100).toLocaleString("en-IN"), decimals: null, period: "year", provider: "Razorpay" }
    : { symbol: "₹", integer: "3,999", decimals: null, period: "year", provider: null };

  return (
    <main className="relative min-h-[calc(100svh-68px)] overflow-hidden">
        {/* ── Ambient background wash ─────────────────────────────── */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 40% at 50% -5%, rgba(201,162,76,0.10), transparent 65%), radial-gradient(50% 45% at 90% 110%, rgba(11,18,38,0.05), transparent 70%)",
          }}
        />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-12 sm:py-16">

          {/* ── Crest + heading ───────────────────────────────────── */}
          <div className="mb-10 flex flex-col items-center text-center sm:mb-12">
            {/* Gold-ringed emblem */}
            <div className="relative mb-6 animate-scale-in">
              <div
                aria-hidden
                className="absolute -inset-2 rounded-full opacity-70 blur-xl"
                style={{
                  background:
                    "radial-gradient(50% 50% at 50% 50%, rgba(201,162,76,0.45), transparent 70%)",
                }}
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-navy ring-1 ring-rotary-gold/40">
                <ShieldCheck className="h-7 w-7 text-rotary-gold-light" />
              </div>
            </div>

            <p className="mb-2.5 animate-fade-in-up stagger-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rotary-gold-dark">
              Final step · Membership
            </p>
            <h1 className="animate-fade-in-up stagger-2 font-[family-name:var(--font-display)] text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-4xl">
              Complete your membership
            </h1>
            <p className="mx-auto mt-3.5 max-w-md animate-fade-in-up stagger-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              You&rsquo;re one step from the verified Rotarian business network.
              Activate below to unlock the global directory.
            </p>

            {/* Step indicator */}
            <ol className="mt-6 flex animate-fade-in stagger-4 items-center gap-2.5 text-[11px] font-medium sm:gap-3 sm:text-xs">
              <li className="flex items-center gap-1.5 text-success">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/15">
                  <Check className="h-2.5 w-2.5" />
                </span>
                Account
              </li>
              <span className="h-px w-5 bg-border sm:w-6" aria-hidden />
              <li className="flex items-center gap-1.5 text-rotary-gold-dark">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rotary-gold/20 text-rotary-gold-dark ring-1 ring-rotary-gold/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-rotary-gold-dark" />
                </span>
                Payment
              </li>
              <span className="h-px w-5 bg-border sm:w-6" aria-hidden />
              <li className="flex items-center gap-1.5 text-muted-foreground/60">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border" />
                Verified
              </li>
            </ol>
          </div>

          {/* ── Card grid ─────────────────────────────────────────── */}
          <div className="grid w-full max-w-4xl animate-fade-in-up stagger-4 gap-5 lg:grid-cols-[1fr_1.05fr]">

            {/* Perks card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div className="mb-6 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-rotary-gold-dark" />
                <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                  What your membership includes
                </h2>
              </div>

              <ul className="space-y-5">
                {perks.map((p) => (
                  <li key={p.title} className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-rotary-gold-light">
                      <p.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                        {p.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment card */}
            <div className="relative overflow-hidden rounded-2xl border border-rotary-gold/25 bg-navy text-white shadow-[var(--shadow-pop)]">
              {/* Gold glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 55% at 50% -10%, rgba(201,162,76,0.22), transparent 70%)",
                }}
              />
              {/* Top gold hairline */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rotary-gold/60 to-transparent"
              />

              <div className="relative p-6 sm:p-8">
                {/* Label + price */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full border border-rotary-gold/30 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rotary-gold-light">
                    Annual membership
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-[family-name:var(--font-display)] text-2xl font-medium text-white/60">
                    {priceDisplay.symbol}
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-none tracking-tight">
                    {priceDisplay.integer}
                  </span>
                  <span className="text-sm font-medium text-white/45">
                    / {priceDisplay.period}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-white/55">
                  One payment · billed annually · cancel anytime
                </p>

                {/* Divider */}
                <div className="my-6 h-px bg-white/10" />

                {/* Included checklist */}
                <ul className="mb-6 space-y-2.5">
                  {included.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-[13px] text-white/75"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rotary-gold/20">
                        <Check className="h-2.5 w-2.5 text-rotary-gold-light" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <PaymentClient hasRazorpay={hasRazorpay} />

                {/* Trust footer */}
                <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
                  {priceDisplay.provider ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Secured by {priceDisplay.provider} · 256-bit SSL encryption
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Demo mode · no real charge will be made
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Reassurance bar ───────────────────────────────────── */}
          <div className="mt-8 flex animate-fade-in stagger-5 flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-rotary-gold-dark" />
              Roster-verified members only
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-rotary-gold-dark" />
              Encrypted checkout
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-rotary-gold-dark" />
              Cancel anytime
            </span>
          </div>
        </div>
    </main>
  );
}
