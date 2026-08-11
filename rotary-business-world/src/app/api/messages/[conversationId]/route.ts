import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import * as messaging from "@/backend/messaging";
import { isAppError } from "@/backend/errors";

/**
 * Polling read for a conversation thread: `GET ?after=<iso>` returns messages
 * created after that timestamp. The client thread polls this every few seconds
 * so replies appear without a manual refresh.
 *
 * This one route is the realtime seam: swap polling for SSE/WebSocket here
 * (Railway supports it) without touching the messaging service or the UI.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const after =
    new URL(request.url).searchParams.get("after") ?? new Date(0).toISOString();

  try {
    const messages = await messaging.getMessagesAfter(
      session.user,
      conversationId,
      after,
    );
    return NextResponse.json({ messages });
  } catch (err) {
    if (isAppError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    throw err;
  }
}
