import { S3StorageService } from "./s3";
import { LocalStorageService } from "./local";
import type { StorageService } from "./types";

let instance: StorageService | null = null;

/** AWS S3 in production (when configured), local disk otherwise. */
export function getStorageService(): StorageService {
  if (instance) return instance;
  const s3Ready =
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET &&
    process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME;
  instance = s3Ready ? new S3StorageService() : new LocalStorageService();
  return instance;
}
