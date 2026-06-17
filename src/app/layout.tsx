import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted display font (no build-time network dependency → durable, NFR3).
// Latin subset only; Japanese body text uses the system stack (see globals.css).
const righteous = localFont({
  src: "./fonts/righteous-latin.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-display",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meatup.love"),
  title: { default: "MEATUP2026", template: "%s ｜ MEATUP2026" },
  description: "お肉、食べようぜ！🍖",
  openGraph: {
    title: "MEATUP2026",
    description: "お肉、食べようぜ！🍖",
    siteName: "meatup",
    type: "website",
    locale: "ja_JP",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // enables env(safe-area-inset-*)
  themeColor: "#b33d44",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={righteous.variable}>
      <body>{children}</body>
    </html>
  );
}
