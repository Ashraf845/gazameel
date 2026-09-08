import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // يسمح بمعاينة معزولة عبر GAZAMEEL_DIST_DIR دون صراع .next/dev
  distDir: process.env.GAZAMEEL_DIST_DIR || ".next",
  poweredByHeader: false,
};

export default nextConfig;
