import type { ErrorEvent, Breadcrumb } from "@sentry/nextjs";

// Sentry stays off unless this is set (NEXT_PUBLIC_* is inlined at build time,
// so the same value reaches the client, server and edge runtimes).
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
  sendDefaultPii: false,
  tracesSampleRate: 0, // errors only; the admin "Performa" tab covers latency
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
};

// Email links carry one-time tokens in the query string (/reset-password,
// /verifikasi-email) and the Google callback carries an OAuth code: keep them
// out of events.
const SECRET_PARAM = /([?&](?:token|code|state)=)[^&#\s"]*/gi;

export function scrubUrl(url: string): string {
  return url.replace(SECRET_PARAM, "$1[redacted]");
}

function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request?.url) event.request.url = scrubUrl(event.request.url);
  if (event.request?.query_string) event.request.query_string = "[redacted]";
  if (event.request?.cookies) delete event.request.cookies;
  event.breadcrumbs?.forEach((b) => scrubBreadcrumb(b));
  return event;
}

function scrubBreadcrumb(b: Breadcrumb): Breadcrumb {
  if (typeof b.message === "string") b.message = scrubUrl(b.message);
  const data = b.data;
  if (data) {
    for (const key of ["url", "from", "to"]) {
      if (typeof data[key] === "string") data[key] = scrubUrl(data[key]);
    }
  }
  return b;
}
