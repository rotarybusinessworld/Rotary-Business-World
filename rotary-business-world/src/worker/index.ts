/**
 * BullMQ worker — runs as a separate Railway service from the same repo.
 *
 * Start command: npm run worker
 *
 * Queue name: "rbw" — all jobs share one queue; job.name routes to the handler.
 * Connection: dedicated ioredis instance with maxRetriesPerRequest: null
 * (required by BullMQ for blocking BRPOP operations).
 *
 * Job handlers:
 *   - "processImage"    strip EXIF from quarantine upload, move to final S3 key
 *   - "digest:admin"    weekly admin verification digest
 *   - "digest:leads"    daily lead notification digest
 *   - "reconcile"       Razorpay payment reconciliation
 */
import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { S3StorageService } from "../backend/storage/s3";
import { checkMagicBytes, stripExif } from "../backend/image";
import type { ProcessImagePayload, MatchNeedPayload } from "../backend/jobs";
// Import the matcher directly (not the ./needs barrel) so the worker doesn't pull
// service.ts → jobs.ts, which import the Next-only "server-only" guard.
import { matchNeed } from "../backend/needs/matching";

const db = new PrismaClient();

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("[worker] REDIS_URL environment variable is required");
  process.exit(1);
}

export const QUEUE_NAME = "rbw";

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

connection.on("error", (err: Error) => {
  console.error("[worker:redis]", err.message);
});

// S3 is required for the processImage job. If env vars are missing the worker
// logs a warning at startup and will throw when processImage jobs arrive.
const s3 = (
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET &&
  process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME
)
  ? new S3StorageService()
  : null;

if (!s3) {
  console.warn("[worker] S3 env vars not set — processImage jobs will fail");
}

async function handleProcessImage(data: ProcessImagePayload): Promise<void> {
  if (!s3) throw new Error("S3 not configured");

  const { quarantineKey, finalKey, mimeType, mediaObjectId } = data;

  // Download raw upload from the private quarantine prefix.
  const rawBytes = await s3.getBytes(quarantineKey);

  // Verify magic bytes match the MIME type declared at presign time.
  // A mismatch means the client lied — mark as FAILED and clean up.
  if (!checkMagicBytes(rawBytes, mimeType)) {
    await s3.deleteObject(quarantineKey).catch(() => {});
    await db.mediaObject.update({
      where: { id: mediaObjectId },
      data: { status: "FAILED" },
    });
    throw new Error(`Magic byte check failed for ${quarantineKey} (${mimeType})`);
  }

  // Strip EXIF/GPS/metadata and apply EXIF orientation.
  const cleanBytes = await stripExif(rawBytes);

  // Upload the processed image to its public final location.
  await s3.putObject(finalKey, cleanBytes, mimeType);

  // Remove the raw quarantine copy — no longer needed.
  await s3.deleteObject(quarantineKey).catch((err: Error) => {
    // Non-fatal: the lifecycle rule will clean it up within 1 hour.
    console.warn("[worker] deleteObject(quarantine) failed:", err.message);
  });

  // Mark the MediaObject ready and record the post-strip byte count.
  await db.mediaObject.update({
    where: { id: mediaObjectId },
    data: { status: "READY", bytes: cleanBytes.length },
  });
}

async function processJob(job: Job): Promise<void> {
  console.log(`[worker] job ${job.id} started (${job.name})`);

  switch (job.name) {
    case "processImage":
      await handleProcessImage(job.data as ProcessImagePayload);
      break;

    case "match-need": {
      const { needId } = job.data as MatchNeedPayload;
      const res = await matchNeed(needId);
      console.log(
        `[worker] match-need ${needId} → ${res.delivered} delivered, ${res.recorded} recorded`,
      );
      break;
    }

    default:
      console.warn(`[worker] unknown job type: ${job.name}`);
  }
}

const worker = new Worker(QUEUE_NAME, processJob, {
  connection,
  concurrency: 5,
});

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed (${job.name})`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed (${job?.name}):`, err.message);
});

worker.on("error", (err) => {
  console.error("[worker]", err.message);
});

console.log(`[worker] started — queue: ${QUEUE_NAME}`);

// Graceful shutdown on SIGINT / SIGTERM so in-flight jobs finish.
async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down…`);
  await worker.close();
  await connection.quit();
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
