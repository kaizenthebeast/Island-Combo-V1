import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF first (smaller than WebP), fall back to WebP, then original.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images at the edge for 31 days instead of the 60s default.
    minimumCacheTTL: 2_678_400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "developers.google.com",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'egxjmbitmuxufyfgwgbs.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
}

export default nextConfig