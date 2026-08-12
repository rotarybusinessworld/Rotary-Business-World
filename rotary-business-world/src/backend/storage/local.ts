import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageService } from "./types";

/**
 * Dev fallback: writes into `public/uploads/**` so Next serves the file at
 * `/uploads/**`. Not for production (Railway's filesystem is ephemeral) — use S3.
 */
export class LocalStorageService implements StorageService {
  async put({
    folder,
    bytes,
    ext,
  }: {
    folder: string;
    bytes: Buffer;
    contentType: string;
    ext: string;
  }) {
    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    const key = `${folder}/${name}`;
    return { url: `/uploads/${key}`, key };
  }

  async get(key: string): Promise<{ bytes: Buffer; contentType?: string } | null> {
    const filePath = path.join(process.cwd(), "public", "uploads", key);
    try {
      const bytes = await readFile(filePath);
      return { bytes };
    } catch {
      return null;
    }
  }
}
