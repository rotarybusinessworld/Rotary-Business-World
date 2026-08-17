import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { getActor } from "@/backend/actor";
import { db } from "@/backend/db";
import { getS3Service } from "@/backend/storage";
import { enqueueProcessImage } from "@/backend/jobs";
import { logger } from "@/backend/logger";

// UUID v4 pattern embedded in key path validation below.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const EXT = "(jpg|png|webp|gif)";
const QUARANTINE_RE = new RegExp(`^quarantine/(${UUID})\\.(${EXT})$`);
const FINAL_RE = new RegExp(`^(gallery|logos|covers|avatars)/(${UUID})\\.(${EXT})$`);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.status !== "VERIFIED") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const snapshot = await getActor(session.user.id);
  if (snapshot?.status === "SUSPENDED") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const s3 = getS3Service();
  if (!s3) {
    return NextResponse.json({ error: "S3 not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { quarantineKey, finalKey } = body as Record<string, unknown>;

  if (typeof quarantineKey !== "string" || typeof finalKey !== "string") {
    return NextResponse.json({ error: "Missing keys" }, { status: 400 });
  }

  const qMatch = QUARANTINE_RE.exec(quarantineKey);
  const fMatch = FINAL_RE.exec(finalKey);

  if (!qMatch || !fMatch) {
    return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
  }

  // Groups: qMatch[1]=uuid, qMatch[2]=ext
  //         fMatch[1]=folder, fMatch[2]=uuid, fMatch[3]=ext
  if (qMatch[1] !== fMatch[2] || qMatch[2] !== fMatch[3]) {
    return NextResponse.json({ error: "Key mismatch" }, { status: 400 });
  }

  const mimeType = EXT_TO_MIME[qMatch[2]!]!;

  // Create the MediaObject row immediately so the client gets a key to display.
  // The worker will update status → READY and fill in the final byte count once
  // it has downloaded, stripped EXIF, and re-uploaded to the final location.
  let mediaObjectId: string;
  try {
    const obj = await db.mediaObject.create({
      data: { key: finalKey, mimeType, status: "PROCESSING" },
    });
    mediaObjectId = obj.id;
  } catch (err) {
    logger.error({ err, finalKey }, "mediaObject.create failed in confirm");
    return NextResponse.json({ error: "Failed to register upload" }, { status: 502 });
  }

  try {
    await enqueueProcessImage({ quarantineKey, finalKey, mimeType, mediaObjectId });
  } catch (err) {
    // Job enqueue failed — roll back the MediaObject row so there is no orphan.
    await db.mediaObject.delete({ where: { id: mediaObjectId } }).catch(() => {});
    logger.error({ err, quarantineKey }, "enqueueProcessImage failed");
    return NextResponse.json({ error: "Failed to queue image processing" }, { status: 502 });
  }

  return NextResponse.json({ key: finalKey });
}
