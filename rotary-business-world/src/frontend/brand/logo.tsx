import Image from "next/image";
import { cn } from "@/shared/utils";

/** RBW emblem tile + serif wordmark. `tone` sets the wordmark colour. */
export function Logo({
  className,
  showText = true,
  tone = "dark",
  size = 40,
}: {
  className?: string;
  showText?: boolean;
  tone?: "dark" | "light";
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-[0_2px_10px_rgb(11_18_38/0.35)]"
        style={{ width: size, height: size, background: "#0b1226" }}
      >
        <Image
          src="/brand/rbw-mark.jpg"
          alt="My Rotary Business World"
          fill
          sizes="48px"
          className="object-cover"
          priority
        />
      </span>
      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight",
              tone === "light" ? "text-white" : "text-foreground",
            )}
          >
            My Rotary Business World
          </span>
          <span
            className={cn(
              "mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em]",
              tone === "light" ? "text-rotary-gold-light" : "text-rotary-gold-dark",
            )}
          >
            Global Directory
          </span>
        </span>
      )}
    </span>
  );
}
