// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://060ad4658914ec9ec0228a581e5dbb73@o4511495620526080.ingest.us.sentry.io/4511495621640192",

  // Full sampling in dev; light sampling in production to keep overhead low.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
});
