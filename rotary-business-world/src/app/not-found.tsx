import Link from "next/link";
import { SiteHeader } from "@/frontend/site-header";
import { buttonVariants } from "@/frontend/ui/button";
import { Compass, Home } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main className="relative flex min-h-[calc(100svh-68px)] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">

        {/* Ambient background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 50% at 50% -5%, rgba(201,162,76,0.09), transparent 65%), radial-gradient(40% 40% at 85% 110%, rgba(11,18,38,0.04), transparent 70%)",
          }}
        />

        <div className="relative max-w-md">

          {/* Giant serif 404 — gold gradient */}
          <p
            className="animate-scale-in select-none font-[family-name:var(--font-display)] text-[7rem] font-semibold leading-none tracking-tight sm:text-[9rem]"
            style={{
              background:
                "linear-gradient(135deg, var(--color-rotary-gold-light) 0%, var(--color-rotary-gold) 50%, var(--color-rotary-gold-dark) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            aria-label="404"
          >
            404
          </p>

          {/* Heading */}
          <h1 className="mt-4 animate-fade-in-up stagger-1 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
            This page wandered off the map.
          </h1>

          {/* Supporting copy */}
          <p className="mx-auto mt-3 animate-fade-in-up stagger-2 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            The link may be broken or the page may have moved. You can head
            back home or browse the verified Rotarian business directory.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex animate-fade-in-up stagger-3 flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className={buttonVariants({ variant: "gold", size: "md" })}
            >
              <Home className="h-4 w-4" />
              Back to home
            </Link>
            <Link
              href="/directory"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              <Compass className="h-4 w-4" />
              Browse the directory
            </Link>
          </div>

          {/* Quiet dashboard link */}
          <p className="mt-10 animate-fade-in stagger-4 text-xs text-muted-foreground/60">
            Looking for your account?{" "}
            <Link
              href="/dashboard"
              className="underline underline-offset-2 transition-colors hover:text-muted-foreground"
            >
              Go to dashboard
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
