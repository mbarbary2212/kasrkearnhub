import * as Sentry from "@sentry/react";

export function initSentry() {
  if (import.meta.env.DEV) return;

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.2,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        const exc = hint?.originalException;
        const msg = (exc instanceof Error ? exc.message : typeof exc === 'string' ? exc : '') || '';
        if (
          msg.includes('Failed to fetch dynamically imported module') ||
          msg.includes('Loading chunk') ||
          msg.includes('ChunkLoadError') ||
          msg.includes('Importing a module script failed') ||
          msg.includes('error loading dynamically imported module') ||
          msg.includes('is not a valid JavaScript MIME type') ||
          (msg.includes('text/html') && msg.includes('MIME'))
        ) return null;
        return event;
      },
    });
  }
}

/**
 * Send an error to Sentry.
 */
export function captureToAll(err: unknown) {
  Sentry.captureException(err);
}
