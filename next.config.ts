import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
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