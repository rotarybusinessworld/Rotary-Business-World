import Link from "next/link";
import Image from "next/image";
import { BrandWatermark } from "@/frontend/brand/brand-watermark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy px-4 py-10">
      <BrandWatermark size={240} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 0%, rgba(201,162,76,0.16), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-6 block w-fit"
          aria-label="My Rotary Business World home"
        >
          <span className="relative block h-16 w-16 animate-scale-in overflow-hidden rounded-2xl ring-1 ring-rotary-gold/25 shadow-[0_10px_30px_-10px_rgba(201,162,76,0.5)]">
            <Image
              src="/brand/rbw-mark.jpg"
              alt="My Rotary Business World"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </span>
        </Link>
        <div className="animate-fade-in-up stagger-1">{children}</div>
        <p className="mt-6 animate-fade-in stagger-3 text-center text-xs text-white/45">
          A private network for verified Rotarian businesses.
        </p>
      </div>
    </div>
  );
}
