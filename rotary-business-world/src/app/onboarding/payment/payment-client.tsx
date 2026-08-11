"use client";

import { useState } from "react";
import { demoCompletePayment } from "@/backend/actions/payment";
import { CreditCard, Loader2 } from "lucide-react";

export function PaymentClient({ hasStripe }: { hasStripe: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleStripeCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  const btnClass =
    "group flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-rotary-gold-light to-rotary-gold py-3.5 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-gold)] transition-all duration-200 hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:translate-y-0 disabled:opacity-60";

  if (hasStripe) {
    return (
      <button
        type="button"
        onClick={handleStripeCheckout}
        disabled={loading}
        className={btnClass}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {loading ? "Redirecting to Stripe…" : "Pay $50 · Activate membership"}
      </button>
    );
  }

  // Demo mode: form action directly — server marks hasPaid true and redirects
  return (
    <form action={demoCompletePayment} onSubmit={() => setLoading(true)}>
      <button type="submit" disabled={loading} className={btnClass}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {loading ? "Activating…" : "Simulate payment · Enter"}
        {!loading && (
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        )}
      </button>
    </form>
  );
}
