import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    // Keys are immutable UUIDs, so a 1-year browser + CDN cache is safe.
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { url: `https://${this.publicHost}/${key}`, key };
  }

  /**
   * Generate a presigned PUT URL for a client to upload directly to S3.
   * The quarantine key (`quarantine/{uuid}.ext`) is private — the public read
   * bucket policy must NOT grant access to the `quarantine/` prefix.
   * The client sends Content-Type matching `contentType` in the PUT request.
   * Expires in `expiresIn` seconds (default: 300s / 5 min).
   */
  async presignPut(key: string, contentType: string, expiresIn = 300): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  /** Download an object and return its bytes. */
  async getBytes(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /** Upload raw bytes to an explicit key (used by the image-processing worker). */
  async putObject(key: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  /** Delete an object (used to clean up quarantine files after processing). */
  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /** Build the public URL for a given key. */
  keyToUrl(key: string): string {
    return `https://${this.publicHost}/${key}`;
  }
}
