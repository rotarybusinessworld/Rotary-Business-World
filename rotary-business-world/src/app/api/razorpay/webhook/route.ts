import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { settlePayment } from "@/backend/services/payment";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    // Webhook not configured — return 200 so Razorpay stops retrying.
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

  // Only handle the captured event — all others get a 200 with no side effects.
  if (event.event !== "payment.captured") {
    return NextResponse.json({ received: true });
  }

  const entity = event.payload?.payment?.entity;
  const userId = entity?.notes?.userId;

  if (!entity || !userId) {
    return NextResponse.json({ received: true });
  }

  // Idempotency: insert a WebhookEvent row before any business logic.
  // ON CONFLICT DO NOTHING (skipDuplicates) — if count === 0, this delivery was
  // already processed; return 200 immediately so Razorpay stops retrying.
  const eventId = `payment.captured:${entity.id}`;
  const webhookInsert = await db.webhookEvent.createMany({
    data: [
      {
        provider: "razorpay",
        eventId,
        eventType: event.event,
        payload: event as object,
        status: "RECEIVED",
      },
    ],
    skipDuplicates: true,
  });

  if (webhookInsert.count === 0) {
    return NextResponse.json({ received: true });
  }

  await settlePayment({
    userId,
    razorpayOrderId: entity.order_id,
    razorpayPaymentId: entity.id,
    amount: entity.amount,
    currency: entity.currency,
    actorId: null,
  });

  await db.webhookEvent.update({
    where: { eventId },
    data: { status: "PROCESSED", processedAt: new Date() },
  });

  return NextResponse.json({ received: true });
}
