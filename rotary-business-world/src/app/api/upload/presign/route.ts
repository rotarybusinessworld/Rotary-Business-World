// S3 bucket CORS configuration required for browser-direct uploads:
//   AllowedHeaders: ["content-type"]
//   AllowedMethods: ["PUT"]
//   AllowedOrigins: ["https://yourdomain.com"]  (or ["*"] for dev)
//   ExposeHeaders: []
//   MaxAgeSeconds: 3000
// Also: the public-read bucket policy must NOT grant s3:GetObject on
// quarantine/* — quarantine objects are private by default and that's correct.
// Add an S3 lifecycle rule to expire quarantine/* objects after 1 hour to
// clean up files from aborted uploads.

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { getActor } from "@/backend/actor";
import { getS3Service } from "@/backend/storage";
import { checkRateLimit } from "@/backend/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
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

  const snapshot = await getActor(session.user.id);
  if (snapshot?.status === "SUSPENDED") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(`upload:${session.user.id}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, slow down" }, { status: 429 });
  }

  const s3 = getS3Service();
  if (!s3) {
    // S3 not configured (local dev) — tell the client to fall back to the
    // server-side upload route which uses LocalStorageService.
    return NextResponse.json({ mode: "server" });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { folder: folderRaw, contentType, size } = body as Record<string, unknown>;

  const folder = ALLOWED_FOLDERS.has(String(folderRaw)) ? String(folderRaw) : null;
  if (!folder) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[String(contentType)];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or GIF images are allowed" },
      { status: 415 },
    );
  }

  if (typeof size !== "number" || size <= 0 || size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 413 });
  }

  const uuid = randomUUID();
  const quarantineKey = `quarantine/${uuid}.${ext}`;
  const finalKey = `${folder}/${uuid}.${ext}`;

  const url = await s3.presignPut(quarantineKey, String(contentType), 300);

  return NextResponse.json({ mode: "s3", quarantineKey, finalKey, url });
}
