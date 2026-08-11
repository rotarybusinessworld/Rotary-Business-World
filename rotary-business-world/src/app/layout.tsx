import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted variable fonts (see src/app/fonts/). We deliberately do NOT use
// next/font/google: it downloads font files from fonts.gstatic.com at build
// time, which fails in build environments that can't reach Google (e.g. the
// Railway build container returned 404s and broke the build). Self-hosting
// removes that build-time network dependency entirely.
const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    {
      path: "./fonts/inter-latin-wght-normal.woff2",
      style: "normal",
      weight: "100 900",
    },
  ],
});

// Serif display for headings — the "expensive", editorial voice.
const fraunces = localFont({
  variable: "--font-fraunces",
  display: "swap",
  src: [
    {
      path: "./fonts/fraunces-latin-wght-normal.woff2",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "./fonts/fraunces-latin-wght-italic.woff2",
      style: "italic",
      weight: "100 900",
    },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "My Rotary Business World — the Rotarian business directory",
    template: "%s · My Rotary Business World",
  },
  description:
    "Discover and connect with verified Rotarian-owned businesses around the world. Search by industry, location and club.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
