import * as Sentry from "@sentry/react";
import {
  BrowserClient,
  defaultStackParser,
  makeFetchTransport,
  Scope,
} from "@sentry/react";

let betterStackScope: Scope | null = null;
let _betterStackClient: BrowserClient | null = null;

export function getBetterStackClient() {
  return _betterStackClient;
}

export function initSentry() {
  if (import.meta.env.DEV) return;

  // --- Primary: Sentry ---
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

  // --- Secondary: Better Stack ---
  const betterStackDsn = import.meta.env.VITE_BETTERSTACK_DSN;
  if (betterStackDsn) {
    _betterStackClient = new BrowserClient({
      dsn: betterStackDsn,
      transport: makeFetchTransport,
      stackParser: defaultStackParser,
      integrations: [],
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
    });
    betterStackScope = new Scope();
    betterStackScope.setClient(_betterStackClient);
    _betterStackClient.init();
  }
}

/**
 * Send an error to both Sentry and Better Stack.
 */
export function captureToAll(err: unknown) {
  // Sentry (global client)
  Sentry.captureException(err);

  // Better Stack (secondary client)
  if (_betterStackClient && betterStackScope) {
    betterStackScope.captureException(err);
  }
}
