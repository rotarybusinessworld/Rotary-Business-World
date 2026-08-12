"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/shared/utils";
import { toImageSrc } from "@/shared/image";

type GalleryImage = { id: string; url: string };

/**
 * Responsive thumbnail grid that opens a fullscreen lightbox on tap/click.
 * Keyboard: Arrow keys to navigate, Escape to close.
 * Accessibility: all controls ≥44px, aria-label'd. Respects prefers-reduced-motion.
 */
export function BusinessGallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isOpen = activeIndex !== null;

  const openAt = useCallback((i: number) => setActiveIndex(i), []);
  const close = useCallback(() => setActiveIndex(null), []);

  const prev = useCallback(() => {
    setActiveIndex((i) =>
      i !== null ? (i - 1 + images.length) % images.length : null,
    );
  }, [images.length]);

  const next = useCallback(() => {
    setActiveIndex((i) =>
      i !== null ? (i + 1) % images.length : null,
    );
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close, prev, next]);

  // Body-scroll lock while lightbox is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (images.length === 0) return null;

  return (
    <>
      {/* ── Thumbnail grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => openAt(i)}
            aria-label={`View photo ${i + 1} of ${images.length}`}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-[var(--radius)] border border-border bg-muted",
              "cursor-pointer transition-all duration-200 ease-out",
              "hover:ring-2 hover:ring-primary/40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <Image
              src={toImageSrc(img.url)!}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              sizes="(min-width: 640px) 200px, 50vw"
            />
            {/* Subtle dark overlay on hover */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/8 motion-reduce:hidden"
            />
          </button>
        ))}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────── */}
      {isOpen && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Gallery — photo ${activeIndex + 1} of ${images.length}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm motion-reduce:backdrop-blur-none"
          onClick={close}
        >
          {/* Image container — stop propagation so clicking the image doesn't close */}
          <div
            className="relative mx-16 w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius)]">
              <Image
                src={toImageSrc(images[activeIndex].url)!}
                alt={`Photo ${activeIndex + 1}`}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 768px, 100vw"
                priority
              />
            </div>

            {/* Index counter */}
            <p className="mt-3 text-center text-sm font-medium text-white/60">
              {activeIndex + 1} / {images.length}
            </p>
          </div>

          {/* ── Prev ─────────────────────────────────────────── */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* ── Next ─────────────────────────────────────────── */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* ── Close ────────────────────────────────────────── */}
          <button
            type="button"
            onClick={close}
            aria-label="Close gallery"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
