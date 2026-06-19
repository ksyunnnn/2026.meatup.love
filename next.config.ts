import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site (no API routes / no SSR): emit a static export to `out/`,
  // deployable to any static host (Firebase Hosting / Cloudflare Pages).
  output: 'export',
  // Static hosts serve directories; trailing slash maps /admin -> /admin/index.html.
  trailingSlash: true,
  // No Image Optimization API on a static export, so next/image must emit the
  // src as-is. Photos are pre-resized/compressed at build-prep time (public/venue).
  images: { unoptimized: true },
};

export default nextConfig;
