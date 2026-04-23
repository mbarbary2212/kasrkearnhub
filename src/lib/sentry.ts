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

/**
 * Capture an exception with structured tags + extras so we can filter
 * in the Sentry UI by feature/provider/table/etc.
 * Validation errors and expected "no rows" results should NOT be sent here.
 */
export function captureWithContext(
  err: unknown,
  options: {
    tags?: Record<string, string | number | boolean | undefined>;
    extra?: Record<string, unknown>;
  } = {},
) {
  const cleanTags: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(options.tags || {})) {
    if (v !== undefined && v !== null && v !== '') cleanTags[k] = v;
  }
  Sentry.captureException(err, {
    tags: cleanTags,
    extra: options.extra,
  });
}

/**
 * Drop a structured breadcrumb so error reports show the timeline of
 * AI calls and case-stage transitions leading up to a failure.
 */
export function addAppBreadcrumb(
  category: 'ai_call' | 'db_write' | 'interactive_case',
  message: string,
  data?: Record<string, unknown>,
  level: 'info' | 'warning' | 'error' = 'info',
) {
  Sentry.addBreadcrumb({ category, message, level, data });
}
