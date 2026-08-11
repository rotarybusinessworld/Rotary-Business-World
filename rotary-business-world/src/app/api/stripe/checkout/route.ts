import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/backend/auth";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

export async function POST() {
  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const stripe = new Stripe(STRIPE_SECRET);
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 5000, // $50.00 membership fee
          product_data: {
            name: "Rotary Business World — Annual Membership",
            description:
              "Verified access to the global Rotarian business directory. One payment per year.",
          },
        },
        quantity: 1,
      },
    ],
    // Embed the user id so the success handler knows who paid.
    metadata: { userId: session.user.id },
    success_url: `${baseUrl}/onboarding/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/onboarding/payment`,
  });

  return NextResponse.json({ url: checkout.url });
}
