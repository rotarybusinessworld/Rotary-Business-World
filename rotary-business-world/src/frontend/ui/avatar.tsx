import Image from "next/image";
import { toImageSrc } from "@/shared/image";

/**
 * Round photo-or-initial avatar.
 *
 * @param name     - Used for the initial letter and img alt.
 * @param photoUrl - Optional photo URL; falls back to initial.
 * @param size     - Width/height in px (default 40).
 */
export function Avatar({
  name,
  photoUrl,
  size = 40,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const initial = name.charAt(0).toUpperCase();
  const src = toImageSrc(photoUrl);
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          style={{ fontSize: Math.round(size * 0.4) }}
          className="font-semibold text-muted-foreground"
        >
          {initial}
        </span>
      )}
    </div>
  );
}
