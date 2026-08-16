import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";
import { getStorageService } from "@/backend/storage";
import { logger } from "@/backend/logger";
import { checkRateLimit } from "@/backend/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ALLOWED_FOLDERS = new Set(["logos", "covers", "gallery", "avatars"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.status !== "VERIFIED") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(`upload:${session.user.id}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, slow down" }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const folderRaw = String(form.get("folder") ?? "gallery");
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "gallery";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or GIF images are allowed" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const { key } = await getStorageService().put({
      folder,
      bytes,
      contentType: file.type,
      ext,
    });

    // Record the upload so orphaned objects can be reconciled later.
    await db.mediaObject.create({
      data: { key, mimeType: file.type, bytes: file.size },
    });

    // Return the key — callers resolve it to a URL using toImageSrc() / keyToUrl().
    return NextResponse.json({ key });
  } catch (err) {
    logger.error({ err, folder }, "image upload failed");
    return NextResponse.json(
      { error: "Upload failed. Please try again later." },
      { status: 502 },
    );
  }
}
