/**
 * @format
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // This ensures we don't do static export
  output: 'standalone',
  // Remove serverActions from experimental as they're now stable
  experimental: {
    // Add any other experimental features you need here
  },
};

module.exports = nextConfig;
