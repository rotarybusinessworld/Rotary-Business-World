import { Logo } from "@/frontend/brand/logo";

/**
 * Full-screen branded loading splash — header-less so it renders instantly
 * (no async auth/DB work). Used by the root loading.tsx; can be reused anywhere.
 *
 * **To change the loader's look**, edit the `--loader-*` tokens in
 * `src/app/globals.css` — no changes needed here.
 */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--loader-bg)]"
      aria-live="polite"
      aria-label={label}
    >
      {/* Ambient radial glow — toned by --loader-glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 40%, var(--loader-glow), transparent 70%)",
        }}
      />

      {/* Spinning arc + RBW emblem */}
      <div className="relative animate-scale-in">
        {/* Outer spinning ring: idle arc via --loader-ring-track, moving arc via --loader-ring-arc */}
        <span
          aria-hidden
          className="absolute inset-0 -m-3 rounded-full border-2 border-[var(--loader-ring-track)] border-t-[var(--loader-ring-arc)] animate-spin"
          style={{ animationDuration: "1.2s", animationTimingFunction: "linear" }}
        />
        {/* Brand mark — emblem tile only, dark tone on light background */}
        <Logo tone="dark" size={52} showText={false} />
      </div>

      {/* Label */}
      <p
        className="mt-6 animate-fade-in font-[family-name:var(--font-display)] text-sm font-medium tracking-wide text-[var(--loader-label)]"
        style={{ animationDelay: "200ms" }}
      >
        {label}
      </p>
    </div>
  );
}
