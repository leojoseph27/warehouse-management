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

  // Include pdfkit's font metrics (.afm) and color profile (.icc) files in
  // the serverless function bundle. Without this, Vercel's output file tracer
  // doesn't include these files, and PDF generation fails at runtime with:
  //   ENOENT: no such file or directory, open '.../pdfkit/js/data/Helvetica.afm'
  outputFileTracingIncludes: {
    '/api/products/export-pdf': [
      './node_modules/pdfkit/js/data/**/*.afm',
      './node_modules/pdfkit/js/data/**/*.icc',
    ],
  },
};

export default nextConfig;
