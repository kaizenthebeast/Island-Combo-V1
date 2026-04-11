import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    domains: ["developers.google.com"],
  }
};

export default nextConfig;
