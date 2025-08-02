/**
 * @format
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },

  // These settings completely disable static optimization
  output: 'standalone',
  trailingSlash: true,

  // Remove all static generation features
  generateBuildId: async () => 'build-' + Date.now(),

  // Disable static pages completely
  experimental: {
    isrMemoryCacheSize: 0,
    disableOptimizedLoading: true,
    largePageDataBytes: 128 * 1000, // 128KB
  },
};

module.exports = nextConfig;
