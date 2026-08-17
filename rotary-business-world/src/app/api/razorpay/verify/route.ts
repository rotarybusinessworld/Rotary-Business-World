import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { auth, unstable_update } from "@/backend/auth";
import { settlePayment } from "@/backend/services/payment";

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

  // Razorpay signature: HMAC-SHA256 of "order_id|payment_id" with key_secret.
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

  // Fetch authoritative amount + currency from Razorpay.
  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${KEY_SECRET}`,
  ).toString("base64");
  const paymentRes = await fetch(
    `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
    { headers: { Authorization: `Basic ${credentials}` } },
  );
  if (!paymentRes.ok) {
    return NextResponse.json(
      { error: "Could not fetch payment details from Razorpay — please retry" },
      { status: 502 },
    );
  }
  const payment = (await paymentRes.json()) as { amount: number; currency: string };

  const settled = await settlePayment({
    userId: session.user.id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    amount: payment.amount,
    currency: payment.currency,
    actorId: session.user.id,
  });

  // Only rewrite the JWT when the payment was genuinely just settled.
  // On a duplicate verify call (settled.created === false) the user's DB status
  // is already beyond PAYMENT_PENDING — overwriting the JWT with
  // PENDING_VERIFICATION would regress a VERIFIED member's session.
  if (settled.created) {
    await unstable_update({ user: { status: "PENDING_VERIFICATION" } });
  }

  return NextResponse.json({ ok: true });
}
