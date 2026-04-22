import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasChunkError: boolean;
}

// Key to track if we've already attempted an auto-reload
const AUTO_RELOAD_KEY = 'chunk_error_auto_reload';

export class ChunkLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State | null {
    // Check if this is a chunk load error
    if (isChunkLoadError(error)) {
      return { hasChunkError: true };
    }
    return null;
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      console.warn('[ChunkLoadErrorBoundary] Detected chunk load error:', error.message);

      // Auto-reload once if we haven't already tried
      const hasAutoReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY);
      if (!hasAutoReloaded) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, 'true');
        console.log('[ChunkLoadErrorBoundary] Auto-reloading to fetch updated chunks...');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    // Clear the flag and force reload
    sessionStorage.removeItem(AUTO_RELOAD_KEY);
    window.location.reload();
  };

  render() {
    if (this.state.hasChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                App Updated
              </h1>
              <p className="text-muted-foreground">
                A new version of KALM Hub is available. Please refresh to continue.
              </p>
            </div>

            <Button
              onClick={this.handleReload}
              size="lg"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </Button>

            <p className="text-xs text-muted-foreground">
              If this keeps happening, try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper to detect chunk load errors
function isChunkLoadError(error: Error): boolean {
  const message = error.message || '';
  const name = error.name || '';

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading CSS chunk') ||
    message.includes("text/html") ||
    message.includes('is not a valid JavaScript MIME type') ||
    name === 'ChunkLoadError' ||
    // Safari-specific error patterns
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  );
}

// Helper to extract error message from various reason types
function getErrorMessage(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message || '';
  }
  if (typeof reason === 'string') {
    return reason;
  }
  if (reason && typeof reason === 'object') {
    // Handle object with message property
    if ('message' in reason && typeof (reason as { message: unknown }).message === 'string') {
      return (reason as { message: string }).message;
    }
  }
  // Fallback to string conversion
  return String(reason || '');
}

// Helper to check if a filename looks like a chunk asset
function isChunkAssetFilename(filename: string | undefined): boolean {
  if (!filename) return false;
  // Match hashed JS/CSS chunk files
  return /\.[a-f0-9]{8,}\.js$/i.test(filename) ||
    /\.[a-f0-9]{8,}\.css$/i.test(filename) ||
    /chunk.*\.js$/i.test(filename) ||
    /assets\/.*\.js$/i.test(filename);
}

// Global handler for unhandled promise rejections (catches lazy load failures)
export function setupChunkErrorHandler() {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = getErrorMessage(reason);

    // Check if it's an Error instance with chunk load error
    const isErrorInstance = reason instanceof Error && isChunkLoadError(reason);

    // Also check string/object messages directly
    const isChunkMessage =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Loading chunk') ||
      message.includes('ChunkLoadError') ||
      message.includes('Importing a module script failed') ||
      message.includes('error loading dynamically imported module');

    if (isErrorInstance || isChunkMessage) {
      console.warn('[ChunkErrorHandler] Caught unhandled chunk load error:', message);

      const hasAutoReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY);
      if (!hasAutoReloaded) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, 'true');
        event.preventDefault();
        window.location.reload();
      }
    }
  });

  // Also handle regular errors (including Safari "Script error." cases)
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    const filename = event.filename || '';

    // Direct chunk load error messages
    const isChunkMessage =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Loading chunk') ||
      message.includes('ChunkLoadError') ||
      message.includes('Importing a module script failed');

    // Safari "Script error." with chunk asset filename
    const isSafariScriptError =
      message === 'Script error.' && isChunkAssetFilename(filename);

    // Generic script error where filename indicates a chunk asset failed
    const isChunkAssetError =
      isChunkAssetFilename(filename) && (
        message.toLowerCase().includes('error') ||
        message.toLowerCase().includes('failed')
      );

    if (isChunkMessage || isSafariScriptError || isChunkAssetError) {
      console.warn('[ChunkErrorHandler] Caught chunk load error via error event:', { message, filename });

      const hasAutoReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY);
      if (!hasAutoReloaded) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, 'true');
        window.location.reload();
      }
    }
  });
}
