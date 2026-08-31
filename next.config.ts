import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // Routini is a fully client-side PWA (all data lives in IndexedDB), so it ships
  // as a static bundle — served from any static host and packaged into the
  // Capacitor Android app from `out/`.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
