import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
// Amount in paise (₹3,999 = 399900 paise). Override via env for other regions.
const AMOUNT_PAISE = parseInt(process.env.RAZORPAY_AMOUNT_PAISE ?? "399900", 10);

export async function POST() {
  if (!KEY_ID || !KEY_SECRET) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
    select: { fullName: true },
  });

  const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: AMOUNT_PAISE,
      currency: "INR",
      receipt: `rbw_${session.user.id.slice(-8)}`,
      // Embedded so the webhook can map order → user without a DB lookup
      notes: { userId: session.user.id },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[razorpay/order] API error", res.status, body);
    return NextResponse.json({ error: "Failed to create order" }, { status: 502 });
  }

  const order = (await res.json()) as { id: string; amount: number; currency: string };

  return NextResponse.json({
    orderId: order.id,
    keyId: KEY_ID,
    amount: order.amount,
    currency: order.currency,
    userName: profile?.fullName ?? session.user.email ?? "",
    userEmail: session.user.email ?? "",
  });
}
