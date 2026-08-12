import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3";
import type { StorageService } from "./types";

/** AWS S3 storage for production (S3-compatible via optional S3_ENDPOINT override). */
export class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;
  private publicHost: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET!;
    this.publicHost = process.env.NEXT_PUBLIC_S3_PUBLIC_HOSTNAME!;
    this.client = new S3Client({
      region: process.env.AWS_REGION!,
      // AWS by default; set S3_ENDPOINT for other S3-compatible providers.
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async put({
    folder,
    bytes,
    contentType,
    ext,
  }: {
    folder: string;
    bytes: Buffer;
    contentType: string;
    ext: string;
  }) {
    const key = `${folder}/${randomUUID()}.${ext}`;
    // No ACL: modern S3 buckets enforce "bucket owner enforced" (ACLs disabled).
    // Public read is granted by a bucket policy or CloudFront, not per-object ACLs.
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return { url: `https://${this.publicHost}/${key}`, key };
  }

  async get(key: string): Promise<{ bytes: Buffer; contentType?: string } | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!res.Body) return null;
      const raw = await res.Body.transformToByteArray();
      return { bytes: Buffer.from(raw), contentType: res.ContentType };
    } catch (err) {
      if (err instanceof NoSuchKey) return null;
      throw err;
    }
  }
}
