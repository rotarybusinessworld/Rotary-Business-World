import { NextResponse } from "next/server";
import Stripe from "stripe";
import { markUserPaid } from "@/backend/services/payment";

/**
 * Stripe webhook — the SOURCE OF TRUTH for paid status.
 *
 * The success-page redirect is UX only: if the customer pays but the redirect
 * never lands (tab closed, network drop), the success page never runs. This
 * webhook fires server-to-server on `checkout.session.completed`, so paid
 * access is granted even when the browser never comes back.
 *
 * Configure in Stripe: point a webhook at /api/stripe/webhook and set
 * STRIPE_WEBHOOK_SECRET. Locally: `stripe listen --forward-to
 * localhost:3000/api/stripe/webhook`.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  const body = await req.text(); // raw body required for signature verification

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (session.payment_status === "paid" && userId) {
      await markUserPaid(userId);
    }
  }

  return NextResponse.json({ received: true });
}
