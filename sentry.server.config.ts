// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://060ad4658914ec9ec0228a581e5dbb73@o4511495620526080.ingest.us.sentry.io/4511495621640192",

  // Full sampling in dev to surface every server transaction while you
  // investigate; light sampling in production to keep overhead/cost down.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
});
