import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { logger } from "@/backend/logger";

/** Liveness/readiness probe for Railway: 200 if the DB answers, 503 otherwise. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    logger.error({ err }, "health check failed");
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
