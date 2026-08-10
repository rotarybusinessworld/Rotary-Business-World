"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Mobile-only hero video component.
 *
 * Renders a square (1:1) card that autoplays the branded clip muted + looping
 * inline — sitting in-flow between the headline and the search bar.
 * Tapping the card opens a fullscreen modal where the video plays with sound.
 *
 * Hidden on lg+ (desktop uses the small absolute-positioned floating card in page.tsx).
 *
 * Source video is 512×512 (square); `aspect-square` + `object-cover` shows it correctly.
 */
export function HeroVideoMobile() {
  const [open, setOpen] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => {
    setOpen(false);
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
      modalVideoRef.current.currentTime = 0;
      modalVideoRef.current.muted = true; // reset so next open re-unmutes cleanly
    }
  }, []);

  // Play with sound when modal opens
  useEffect(() => {
    if (!open || !modalVideoRef.current) return;
    const v = modalVideoRef.current;
    v.muted = false;
    v.play().catch(() => {
      // Some browsers block unmuted autoplay; fall back to muted
      v.muted = true;
      v.play().catch(() => {});
    });
  }, [open]);

  // Keyboard dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeModal]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* ── Inline autoplay card (mobile only) ─────────────────────────────── */}
      <div className="lg:hidden relative mx-auto mt-7 w-full max-w-[300px]">
        {/* Ambient gold glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-5 rounded-[2.5rem] opacity-65 blur-2xl"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(201,162,76,0.55), transparent 70%)",
          }}
        />

        {/* Card — entire surface is tappable → opens fullscreen */}
        <button
          type="button"
          onClick={openModal}
          aria-label="Expand Rotary in motion video fullscreen"
          className="group relative block w-full touch-manipulation overflow-hidden rounded-2xl shadow-[var(--shadow-gold)] ring-1 ring-rotary-gold/40 transition-transform duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rotary-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        >
          {/* Square video — muted autoplay loop, matches source 1:1 ratio */}
          <div className="aspect-square w-full bg-navy-800">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/brand/rotary-hero-poster.jpg"
              aria-hidden="true"
              className="h-full w-full object-cover motion-reduce:hidden"
            >
              <source src="/brand/rotary-hero.mp4" type="video/mp4" />
            </video>
            {/* Reduced-motion: show poster instead of animated video */}
            <div
              aria-hidden
              className="hidden h-full w-full bg-cover bg-center motion-reduce:block"
              style={{ backgroundImage: "url('/brand/rotary-hero-poster.jpg')" }}
            />
          </div>

          {/* Expand affordance — top-right corner pill */}
          <div
            aria-hidden
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60 group-hover:scale-110"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </div>

          {/* Caption — bottom-left */}
          <div className="absolute bottom-3 left-3.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rotary-gold" />
            <span className="text-[11px] font-medium text-rotary-gold-light">
              Rotary in motion
            </span>
          </div>

          {/* Inner ring polish */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
          />
        </button>
      </div>

      {/* ── Fullscreen modal ─────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rotary in motion — full video"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm motion-reduce:backdrop-blur-none"
          onClick={closeModal}
        >
          {/* Video container — stop propagation so clicking video doesn't close */}
          <div
            className="relative w-full max-w-md px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={modalVideoRef}
              controls
              playsInline
              preload="auto"
              poster="/brand/rotary-hero-poster.jpg"
              className="w-full rounded-2xl shadow-2xl"
            >
              <source src="/brand/rotary-hero.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Close — 44×44 minimum touch target */}
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close video"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
