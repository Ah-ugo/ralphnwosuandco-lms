/**
 * @format
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  experimental: {
    serverActions: true,
    // Use dynamic import instead of require
    incrementalCacheHandlerPath: await import('node:path').then((path) =>
      path.resolve('./cache-handler.js')
    ),
    isrMemoryCacheSize: 0,
  },
};

export default nextConfig;
