import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['scaned-website--scaned-1f910.asia-southeast1.hosted.app'],
  },
  // This ensures public assets are correctly handled
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
};

export default nextConfig;