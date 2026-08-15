/**
 * Static, zero-async placeholder for SiteHeader. Renders instantly — no auth(),
 * no DB queries. Used in every loading.tsx so navigation feels immediate.
 */
export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-navy/95 backdrop-blur supports-[backdrop-filter]:bg-navy/80">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rotary-gold/20 to-transparent"
      />
      <div className="relative mx-auto flex h-[68px] max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-white/10" />

        {/* Search bar — desktop */}
        <div className="hidden flex-1 md:flex md:px-4">
          <div className="mx-auto h-9 w-full max-w-xl animate-pulse rounded-full bg-white/10" />
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-4 md:flex">
            <div className="h-3.5 w-16 animate-pulse rounded bg-white/10" />
            <div className="h-3.5 w-20 animate-pulse rounded bg-white/10" />
            <div className="h-3.5 w-16 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-px w-px opacity-0 md:mx-2 md:h-5 md:w-px md:opacity-100 md:bg-white/10" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </header>
  );
}
