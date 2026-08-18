import "server-only";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const QUEUE_NAME = "rbw";

declare global {
  var _bullQueue: Queue | null | undefined;
}

function createQueue(): Queue | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // BullMQ requires maxRetriesPerRequest: null for its internal blocking commands.
  const connection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  connection.on("error", (err: Error) => console.error("[jobs:redis]", err.message));
  return new Queue(QUEUE_NAME, { connection });
}

// Reuse the Queue instance across HMR reloads in dev to avoid connection leaks.
const jobQueue: Queue | null =
  process.env.NODE_ENV === "production"
    ? createQueue()
    : (global._bullQueue ??= createQueue());

export interface ProcessImagePayload {
  quarantineKey: string;
  finalKey: string;
  mimeType: string;
  mediaObjectId: string;
}

export async function enqueueProcessImage(data: ProcessImagePayload): Promise<void> {
  if (!jobQueue) {
    throw new Error("REDIS_URL is not configured — cannot enqueue image processing job");
  }
  await jobQueue.add("processImage", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  });
}

export interface MatchNeedPayload {
  needId: string;
}

/**
 * Enqueue lead matching for a freshly posted Need. Matching is intentionally
 * out-of-band (see docs/NEEDS-LEADS.md §5): the poster's request returns
 * immediately; the worker runs the filter + scoring + caps. Retries are safe —
 * matchNeed() is idempotent via @@unique([needId, businessId]).
 */
export async function enqueueMatchNeed(data: MatchNeedPayload): Promise<void> {
  if (!jobQueue) {
    throw new Error("REDIS_URL is not configured — cannot enqueue match-need job");
  }
  await jobQueue.add("match-need", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  });
}
