import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site (no API routes / no SSR): emit a static export to `out/`,
  // deployable to any static host (Firebase Hosting / Cloudflare Pages).
  output: 'export',
  // Static hosts serve directories; trailing slash maps /admin -> /admin/index.html.
  trailingSlash: true,
};

export default nextConfig;
