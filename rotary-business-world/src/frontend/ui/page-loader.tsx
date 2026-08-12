import { Logo } from "@/frontend/brand/logo";

/**
 * Full-screen branded loading splash — header-less so it renders instantly
 * (no async auth/DB work). Used by the root loading.tsx; can be reused anywhere.
 */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-navy"
      aria-live="polite"
      aria-label={label}
    >
      {/* Ambient gold radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 40%, rgba(201,162,76,0.12), transparent 70%)",
        }}
      />

      {/* Spinning gold arc + RBW mark */}
      <div className="relative animate-scale-in">
        {/* Outer spinning ring */}
        <span
          aria-hidden
          className="absolute inset-0 -m-3 rounded-full border-2 border-rotary-gold/15 border-t-rotary-gold animate-spin"
          style={{ animationDuration: "1.2s", animationTimingFunction: "linear" }}
        />
        {/* Brand mark — no wordmark, just the emblem tile */}
        <Logo tone="light" size={52} showText={false} />
      </div>

      {/* Label */}
      <p
        className="mt-6 animate-fade-in font-[family-name:var(--font-display)] text-sm font-medium tracking-wide text-white/45"
        style={{ animationDelay: "200ms" }}
      >
        {label}
      </p>
    </div>
  );
}
