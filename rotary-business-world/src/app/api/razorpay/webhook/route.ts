import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { recordMembershipPayment } from "@/backend/services/payment";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    // Webhook not configured — return 200 so Razorpay stops retrying
    return NextResponse.json({ received: true });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  const valid =
    expectedBuf.length === receivedBuf.length &&
    timingSafeEqual(expectedBuf, receivedBuf);

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: {
      payment?: {
        entity?: {
          id: string;
          order_id: string;
          amount: number;
          currency: string;
          notes?: { userId?: string };
        };
      };
    };
  };

  // Only handle the captured event — other events are irrelevant and we return 200
  if (event.event === "payment.captured") {
    const entity = event.payload?.payment?.entity;
    const userId = entity?.notes?.userId;

    if (entity && userId) {
      await recordMembershipPayment({
        userId,
        source: "RAZORPAY",
        amount: entity.amount,
        currency: entity.currency,
        razorpayPaymentId: entity.id,
        razorpayOrderId: entity.order_id,
        actorId: null, // system event
      });
    }
  }

  return NextResponse.json({ received: true });
}
