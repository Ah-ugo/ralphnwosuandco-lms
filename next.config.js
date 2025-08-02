/**
 * @format
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },

  // These settings completely disable static export
  output: 'standalone',
  trailingSlash: true,

  // Disable all static optimization
  experimental: {
    disableOptimizedLoading: true,
    isrMemoryCacheSize: 0,
    // Add this to prevent any static generation
    fallbackNodePolyfills: false,
  },
};

module.exports = nextConfig;
