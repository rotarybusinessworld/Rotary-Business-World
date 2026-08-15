"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoCompletePayment } from "@/backend/actions/payment";
import { CreditCard, Loader2 } from "lucide-react";

// Razorpay injects `window.Razorpay` after checkout.js loads
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.head.appendChild(script);
  });
}

export function PaymentClient({ hasRazorpay }: { hasRazorpay: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRazorpayCheckout() {
    setLoading(true);
    try {
      await loadRazorpayScript();

      const orderRes = await fetch("/api/razorpay/order", { method: "POST" });
      if (!orderRes.ok) {
        setLoading(false);
        return;
      }
      const order = (await orderRes.json()) as {
        orderId: string;
        keyId: string;
        amount: number;
        currency: string;
        userName: string;
        userEmail: string;
      };

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Rotary Business World",
        description: "Annual membership",
        order_id: order.orderId,
        prefill: { name: order.userName, email: order.userEmail },
        theme: { color: "#c9a24c" },
        // Explicitly list payment methods so UPI always appears even when the
        // dashboard default omits it in test mode.
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          emi: false,
          paylater: false,
        },
        modal: {
          ondismiss() {
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (verifyRes.ok) {
            router.push("/dashboard");
          } else {
            setLoading(false);
          }
        },
      });

      rzp.open();
    } catch {
      setLoading(false);
    }
  }

  const btnClass =
    "group flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-rotary-gold-light to-rotary-gold py-3.5 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-gold)] transition-all duration-200 hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:translate-y-0 disabled:opacity-60";

  if (hasRazorpay) {
    return (
      <button
        type="button"
        onClick={handleRazorpayCheckout}
        disabled={loading}
        className={btnClass}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {loading ? "Opening payment…" : "Pay ₹3,999 · Activate membership"}
      </button>
    );
  }

  // Demo mode: form action directly — server records payment and advances status to PENDING_VERIFICATION
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
