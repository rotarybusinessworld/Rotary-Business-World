import { S3StorageService } from "./s3";
import { LocalStorageService } from "./local";
import type { StorageService } from "./types";

let instance: StorageService | null = null;
let s3Instance: S3StorageService | null = null;

function s3Ready(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET &&
    process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME
  );
}

/** AWS S3 in production (when configured), local disk otherwise. */
export function getStorageService(): StorageService {
  if (instance) return instance;
  instance = s3Ready() ? new S3StorageService() : new LocalStorageService();
  return instance;
}

/**
 * Returns the S3 service when S3 env vars are present, otherwise null.
 * Used by the presign/confirm upload flow which requires S3-specific methods.
 */
export function getS3Service(): S3StorageService | null {
  if (!s3Ready()) return null;
  if (!s3Instance) s3Instance = new S3StorageService();
  return s3Instance;
}
