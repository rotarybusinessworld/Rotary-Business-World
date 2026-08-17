import sharp from "sharp";

/**
 * Verify that the first bytes of `buf` match the magic bytes for `mimeType`.
 * Clients can lie about Content-Type; actual file signatures cannot.
 *
 * JPEG: FF D8 FF
 * PNG:  89 50 4E 47 0D 0A 1A 0A
 * WebP: RIFF????WEBP (bytes 0–3 and 8–11)
 * GIF:  GIF8 (bytes 0–3)
 */
export function checkMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    );
  }
  if (mimeType === "image/gif") {
    return (
      buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
    );
  }
  return false;
}

/**
 * Apply EXIF orientation then strip all metadata (GPS, camera model, etc.).
 * .rotate() reads the EXIF orientation tag and rotates pixels accordingly.
 * Not calling .withMetadata() is intentional — sharp strips all EXIF/IPTC/XMP
 * by default, so no GPS coordinates or device info leak to image consumers.
 */
export async function stripExif(buf: Buffer): Promise<Buffer> {
  return sharp(buf).rotate().toBuffer();
}
