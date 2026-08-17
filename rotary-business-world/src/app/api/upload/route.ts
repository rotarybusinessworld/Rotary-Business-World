import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";
import { getStorageService } from "@/backend/storage";
import { logger } from "@/backend/logger";
import { checkRateLimit } from "@/backend/rate-limit";
import { getActor } from "@/backend/actor";
import { checkMagicBytes, stripExif } from "@/backend/image";

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

  // Re-check live status from the actor cache — the JWT may be stale (e.g.
  // a suspended user still holds a VERIFIED token for up to 30 days).
  const snapshot = await getActor(session.user.id);
  if (snapshot?.status === "SUSPENDED") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
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

  const rawBytes = Buffer.from(await file.arrayBuffer());

  // Reject files whose content does not match the declared MIME type.
  if (!checkMagicBytes(rawBytes, file.type)) {
    return NextResponse.json(
      { error: "File content does not match the declared type" },
      { status: 415 },
    );
  }

  let bytes: Buffer;
  try {
    bytes = await stripExif(rawBytes);
  } catch (err) {
    logger.warn({ err, mimeType: file.type }, "sharp processing failed");
    return NextResponse.json(
      { error: "Could not process the image. Please try a different file." },
      { status: 415 },
    );
  }

  try {
    const { key } = await getStorageService().put({
      folder,
      bytes,
      contentType: file.type,
      ext,
    });

    // Record the upload so orphaned objects can be reconciled later.
    // Use the post-strip byte count — EXIF removal changes the file size.
    await db.mediaObject.create({
      data: { key, mimeType: file.type, bytes: bytes.length },
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
