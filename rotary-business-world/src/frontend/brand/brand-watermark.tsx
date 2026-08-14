import Image from "next/image";

/**
 * Subtle RBW emblem watermark for dark (navy) surfaces.
 *
 * Self-clipping: the `absolute inset-0 overflow-hidden` shell fills the parent
 * exactly, so this component can never create horizontal overflow on mobile —
 * no negative margins, no body scrollWidth inflation.
 *
 * Change opacity globally via `--watermark-opacity` in `src/app/globals.css`.
 * Change visual size via the `size` prop.
 *
 * Parent only needs `position: relative`.
 */
export function BrandWatermark({ size = 240 }: { size?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 rotate-12 select-none mix-blend-screen opacity-[var(--watermark-opacity)]">
        <Image
          src="/brand/rbw-mark.jpg"
          alt=""
          width={size}
          height={size}
          className="rounded-2xl"
        />
      </span>
    </div>
  );
}
