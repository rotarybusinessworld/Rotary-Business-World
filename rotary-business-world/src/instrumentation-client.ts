import * as Sentry from "@sentry/nextjs";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Trace 10% of transactions to stay within the free quota.
    tracesSampleRate: 0.1,
    // Capture replays only for error sessions to stay within quota.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
  });
}
