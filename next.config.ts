import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    domains: ["developers.google.com"],
     remotePatterns: [
      {
        protocol: 'https',
        hostname: 'egxjmbitmuxufyfgwgbs.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  }
};

export default nextConfig;
