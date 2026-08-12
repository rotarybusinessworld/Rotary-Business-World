import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { getStorageService } from "@/backend/storage";
import { logger } from "@/backend/logger";

/**
 * Authenticated image proxy — streams objects from the private S3 bucket (or local
 * `public/uploads/` in dev) to logged-in users only.
 *
 * URL shape: /api/images/<folder>/<uuid>.<ext>
 * Auth: any valid session (logged-in user) is sufficient.
 * Cache: `private, immutable` — keys are per-upload UUIDs so a changed image is a new URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { key: segments } = await params;
  const key = segments.join("/");

  try {
    const obj = await getStorageService().get(key);
    if (!obj) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new Response(new Uint8Array(obj.bytes), {
      headers: {
        "Content-Type": obj.contentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    logger.error({ err, key }, "image proxy: failed to fetch from storage");
    return NextResponse.json(
      { error: "Failed to load image. Please try again." },
      { status: 502 },
    );
  }
}
