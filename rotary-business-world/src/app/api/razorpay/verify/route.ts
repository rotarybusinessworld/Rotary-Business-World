import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { recordMembershipPayment } from "@/backend/services/payment";

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(req: Request) {
  if (!KEY_SECRET) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await req.json()) as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Razorpay signature: HMAC-SHA256 of "order_id|payment_id" with key_secret
  const expected = createHmac("sha256", KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(razorpay_signature, "hex");

  const valid =
    expectedBuf.length === receivedBuf.length &&
    timingSafeEqual(expectedBuf, receivedBuf);

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Fetch amount + currency from Razorpay so we record the authoritative values
  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${KEY_SECRET}`,
  ).toString("base64");
  const paymentRes = await fetch(
    `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
    { headers: { Authorization: `Basic ${credentials}` } },
  );
  const payment = paymentRes.ok
    ? ((await paymentRes.json()) as { amount: number; currency: string })
    : { amount: 0, currency: "INR" };

  await recordMembershipPayment({
    userId: session.user.id,
    source: "RAZORPAY",
    amount: payment.amount,
    currency: payment.currency,
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    actorId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
