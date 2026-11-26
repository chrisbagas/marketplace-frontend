import { SENTRY_DSN, sentryOptions } from "@/lib/sentry";

// The SDK is loaded lazily so it never lands in the shared first-load bundle:
// it is built as a separate async chunk that the browser only fetches when a
// DSN is set, so a disabled Sentry costs nothing at runtime. Tradeoff: errors
// thrown before that chunk has loaded and Sentry.init has run are not reported.
// onRouterTransitionStart is intentionally not exported: it would force a
// static SDK import and only feeds tracing, which is off (tracesSampleRate 0).
if (SENTRY_DSN) {
  import("@sentry/nextjs")
    .then((Sentry) => Sentry.init(sentryOptions))
    .catch(() => {}); // a failed chunk load must not break the page
}
