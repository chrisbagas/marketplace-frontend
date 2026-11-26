import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry";

if (SENTRY_DSN) Sentry.init(sentryOptions);
