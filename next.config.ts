import { withSentryConfig } from "@sentry/nextjs";
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
  // Preserve old URLs after the App Router route renames (Batch 3) so existing
  // links/bookmarks/SEO keep working instead of 404-ing.
  async redirects() {
    return [
      { source: '/product/:path*',  destination: '/products/:path*',   permanent: true },
      { source: '/category/:path*', destination: '/categories/:path*', permanent: true },
      { source: '/user/details',    destination: '/account',           permanent: true },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "croco-s6",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // tunnelRoute removed: it routed all browser telemetry through this Next.js
  // server to dodge ad-blockers, which (per Sentry's own note) increases server
  // load and hosting cost. Browser events now go straight to Sentry.

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
