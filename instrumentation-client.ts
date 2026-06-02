// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://060ad4658914ec9ec0228a581e5dbb73@o4511495620526080.ingest.us.sentry.io/4511495621640192",

  // Performance tracing only. Session Replay was removed — its continuous DOM
  // recording (replayIntegration) was the main client-side slowdown. Default
  // integrations still include browser performance tracing, which is what you
  // need to see where time goes.
  //
  // Full sampling in dev so every transaction shows up while you investigate;
  // light sampling in production to keep overhead/cost low.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
