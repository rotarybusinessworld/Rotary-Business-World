import Link from "next/link";
import { SiteHeader } from "@/frontend/site-header";
import { Logo } from "@/frontend/brand/logo";
import { buttonVariants } from "@/frontend/ui/button";
import {
  BadgeCheck,
  Building2,
  Globe2,
  Handshake,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Verified Rotarians only",
    body: "Every member is matched against the official Rotary roster, so every connection you make is one you can trust.",
  },
  {
    icon: Search,
    title: "Search, perfected",
    body: "Typo-tolerant, instant results across the network — filter by industry, category, city, country and club.",
  },
  {
    icon: Handshake,
    title: "Your industry, worldwide",
    body: "Find fellow Rotarians doing exactly what you do, anywhere on earth, and grow your business together.",
  },
];

const stats = [
  { icon: Building2, label: "Curated businesses" },
  { icon: Users, label: "Verified members" },
  { icon: Globe2, label: "Countries" },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* Hero — dark, editorial, gold-lit */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 0%, rgba(201,162,76,0.18), transparent 70%), radial-gradient(40% 40% at 85% 20%, rgba(38,50,90,0.6), transparent 70%)",
          }}
        />
        <div className="relative mx-auto flex min-h-[calc(100svh-68px)] max-w-4xl flex-col items-center justify-center px-4 py-14 text-center sm:py-20">
          <span className="mb-6 inline-flex max-w-full animate-fade-in-up items-center gap-2 rounded-full border border-rotary-gold/30 bg-white/5 px-4 py-1.5 text-[11px] font-medium tracking-wide text-rotary-gold-light sm:text-xs">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
            The trusted network for Rotarian enterprise
          </span>
          <h1 className="animate-fade-in-up stagger-1 font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-6xl sm:leading-[1.08]">
            Where Rotarians do
            <br className="hidden sm:block" />{" "}
            <span className="italic text-rotary-gold-light">business</span> with the world
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-fade-in-up stagger-2 text-lg text-white/70">
            A private, verified directory of Rotarian-owned businesses. Discover
            partners, suppliers and peers you can trust — across every industry
            and continent.
          </p>

          {/* Search */}
          <form
            action="/directory"
            className="mx-auto mt-9 flex max-w-xl animate-fade-in-up stagger-3 items-center gap-2 rounded-full bg-white p-2 shadow-[var(--shadow-pop)]"
          >
            <div className="flex flex-1 items-center gap-2 pl-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                name="q"
                placeholder="Search businesses, industries, cities…"
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Search the directory"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-full bg-rotary-gold px-6 text-sm font-semibold text-secondary-foreground transition-all duration-200 ease-out hover:-translate-y-px hover:bg-rotary-gold-light"
            >
              Search
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 animate-fade-in stagger-4 text-sm text-white/55">
            {stats.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-2">
                <s.icon className="h-4 w-4 text-rotary-gold" />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Ambient brand video — a small, gold-framed accent (decorative) */}
        <div className="relative z-10 mx-auto mb-16 w-44 animate-fade-in-up stagger-4 sm:w-52 lg:absolute lg:bottom-12 lg:right-[6%] lg:mx-0 lg:mb-0 lg:w-60">
          {/* soft gold glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-[1.9rem] opacity-70 blur-2xl"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 50%, rgba(201,162,76,0.45), transparent 70%)",
            }}
          />
          <div className="group relative overflow-hidden rounded-2xl shadow-[var(--shadow-gold)] ring-1 ring-rotary-gold/40 transition-transform duration-300 ease-out hover:-translate-y-1">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/brand/rotary-hero-poster.jpg"
              aria-hidden="true"
              className="aspect-square w-full object-cover motion-reduce:hidden"
            >
              <source src="/brand/rotary-hero.mp4" type="video/mp4" />
            </video>
            {/* reduced-motion: show the still poster only */}
            <div
              aria-hidden
              className="hidden aspect-square w-full bg-cover bg-center motion-reduce:block"
              style={{ backgroundImage: "url('/brand/rotary-hero-poster.jpg')" }}
            />
            {/* inner vignette to seat the frame */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
            />
          </div>
          {/* floating caption pill */}
          <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-navy-700/90 px-3 py-1 text-[11px] font-medium text-rotary-gold-light ring-1 ring-rotary-gold/30 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-rotary-gold" />
            Rotary in motion
          </span>
        </div>

        {/* gold hairline base */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-rotary-gold/40 to-transparent" />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rotary-gold-dark">
            Why members join
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Built for trust, designed for growth
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-rotary-gold-light transition-transform duration-200 ease-out group-hover:scale-105">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mb-20 max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-navy px-8 py-14 text-center text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 80% at 50% 0%, rgba(201,162,76,0.16), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
              List your business. Grow with Rotarians.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/70">
              Join free, get verified against the Rotary roster, and put your
              business in front of a global community of members.
            </p>
            <Link
              href="/register"
              className={`${buttonVariants({ variant: "gold", size: "lg" })} mt-7`}
            >
              Join the network
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-navy text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Logo tone="light" />
          <p className="text-sm">
            © {new Date().getFullYear()} Rotary Business World. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
