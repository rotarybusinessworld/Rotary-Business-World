import { NextResponse } from "next/server";
import { auth } from "@/backend/auth";
import { getStorageService } from "@/backend/storage";
import { logger } from "@/backend/logger";

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
    const { url } = await getStorageService().put({
      folder,
      bytes,
      contentType: file.type,
      ext,
    });
    return NextResponse.json({ url });
  } catch (err) {
    // S3 down / bad creds / bucket policy — degrade to a clean 502 the client can
    // show as "upload failed", never an unhandled 500 / Internal Server Error.
    logger.error({ err, folder }, "image upload failed");
    return NextResponse.json(
      { error: "Upload failed. Please try again later." },
      { status: 502 },
    );
  }
}
