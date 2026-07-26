import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [],
  },
  // Enable production source maps so minified stack traces can be mapped
  // back to the original TypeScript source.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
