"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

const AUDIO_VOLUME = 0.5; // "mid" — medium volume per brand request

/**
 * Audio-aware hero video hook.
 *
 * The hero renders TWO video elements (one for mobile, one for the desktop
 * floating card) but only one is on-screen at a given breakpoint. To avoid
 * double audio we gate sound to the instance that matches the current viewport
 * (`side`), driven by a matchMedia query on the `lg` breakpoint.
 *
 * Browsers block UNMUTED autoplay for visitors with no media-engagement, so we:
 *   1. autoplay muted (always allowed),
 *   2. attempt an immediate unmuted play (works for returning/engaged users),
 *   3. otherwise unmute on the first user gesture anywhere on the page.
 * A manual mute/unmute click takes over and is respected from then on.
 */
function useVideoAudio(side: "mobile" | "desktop") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const userTookControl = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Under prefers-reduced-motion the <video> is hidden (motion-reduce:hidden)
    // and only the poster shows — so never play it or its audio, and don't
    // attach gesture listeners. Otherwise audio would come from an invisible
    // element whose mute button is also hidden.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.muted = true;
      setMuted(true);
      return;
    }

    const mq = window.matchMedia("(min-width: 1024px)");
    const isActiveSide = () => (side === "desktop" ? mq.matches : !mq.matches);

    v.volume = AUDIO_VOLUME;

    const unmute = () => {
      if (userTookControl.current || !isActiveSide()) return;
      v.muted = false;
      v.volume = AUDIO_VOLUME;
      v.play()
        .then(() => setMuted(false))
        .catch(() => {
          // still blocked — stay muted, wait for a gesture
          v.muted = true;
          setMuted(true);
        });
    };

    // 1 + 2: muted autoplay, then try to promote to sound on the active side.
    if (isActiveSide()) {
      v.muted = false;
      v.play()
        .then(() => setMuted(false))
        .catch(() => {
          v.muted = true;
          setMuted(true);
          v.play().catch(() => {});
        });
    } else {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    }

    // 3: first user gesture anywhere unmutes the active instance. Gestures on
    //    the video card's own controls are ignored (toggleMute handles those).
    const onGesture = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-hero-video]")) return;
      unmute();
      teardownGesture();
    };
    const teardownGesture = () => {
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("keydown", onGesture);
      document.removeEventListener("touchstart", onGesture);
    };
    document.addEventListener("pointerdown", onGesture);
    document.addEventListener("keydown", onGesture);
    document.addEventListener("touchstart", onGesture);

    // Breakpoint change: mute whichever instance is no longer on-screen so
    // audio never plays from a hidden video.
    const onBreakpoint = () => {
      if (!isActiveSide()) {
        v.muted = true;
        setMuted(true);
      } else if (!userTookControl.current) {
        unmute();
      }
    };
    mq.addEventListener("change", onBreakpoint);

    return () => {
      teardownGesture();
      mq.removeEventListener("change", onBreakpoint);
    };
  }, [side]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    userTookControl.current = true;
    const next = !v.muted; // read the live element state to avoid races
    v.muted = next;
    if (!next) v.volume = AUDIO_VOLUME;
    setMuted(next);
  }, []);

  return { videoRef, muted, toggleMute };
}

/** Floating mute/unmute button — used inside both video cards */
function MuteButton({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? "Unmute video" : "Mute video"}
      className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {muted ? (
        <VolumeX className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/**
 * Mobile inline hero video — plays in-flow between the headline and search bar
 * on screens below lg.
 */
export function HeroVideoMobile() {
  const { videoRef, muted, toggleMute } = useVideoAudio("mobile");

  return (
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

      <div
        data-hero-video
        className="relative overflow-hidden rounded-2xl shadow-[var(--shadow-gold)] ring-1 ring-rotary-gold/40"
      >
        <div className="aspect-square w-full bg-navy-800">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/brand/rotary-hero-poster.jpg"
            className="h-full w-full object-cover motion-reduce:hidden"
          >
            <source src="/brand/rotary-hero.mp4" type="video/mp4" />
          </video>
          <div
            aria-hidden
            className="hidden h-full w-full bg-cover bg-center motion-reduce:block"
            style={{ backgroundImage: "url('/brand/rotary-hero-poster.jpg')" }}
          />
        </div>

        <MuteButton muted={muted} onToggle={toggleMute} />

        {/* Caption */}
        <div className="absolute bottom-3 left-3.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rotary-gold" />
          <span className="text-[11px] font-medium text-rotary-gold-light">
            Rotary in motion
          </span>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
        />
      </div>
    </div>
  );
}

/**
 * Desktop floating video card — used inside the absolute-positioned accent in
 * the hero section on lg+ screens. Same audio behaviour as mobile.
 */
export function HeroVideoDesktopCard() {
  const { videoRef, muted, toggleMute } = useVideoAudio("desktop");

  return (
    <div
      data-hero-video
      className="group relative overflow-hidden rounded-2xl shadow-[var(--shadow-gold)] ring-1 ring-rotary-gold/40 transition-transform duration-300 ease-out hover:-translate-y-1"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/brand/rotary-hero-poster.jpg"
        className="aspect-square w-full object-cover motion-reduce:hidden"
      >
        <source src="/brand/rotary-hero.mp4" type="video/mp4" />
      </video>
      <div
        aria-hidden
        className="hidden aspect-square w-full bg-cover bg-center motion-reduce:block"
        style={{ backgroundImage: "url('/brand/rotary-hero-poster.jpg')" }}
      />

      <MuteButton muted={muted} onToggle={toggleMute} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
      />
    </div>
  );
}
