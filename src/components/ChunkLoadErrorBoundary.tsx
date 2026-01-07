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
                A new version of KasrLearn is available. Please refresh to continue.
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
    name === 'ChunkLoadError' ||
    // Safari-specific error patterns
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  );
}

// Global handler for unhandled promise rejections (catches lazy load failures)
export function setupChunkErrorHandler() {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error instanceof Error && isChunkLoadError(error)) {
      console.warn('[ChunkErrorHandler] Caught unhandled chunk load error');
      
      const hasAutoReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY);
      if (!hasAutoReloaded) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, 'true');
        event.preventDefault();
        window.location.reload();
      }
    }
  });

  // Also handle regular errors
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('Failed to fetch dynamically imported module') ||
      event.message.includes('Loading chunk')
    )) {
      console.warn('[ChunkErrorHandler] Caught chunk load error via error event');
      
      const hasAutoReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY);
      if (!hasAutoReloaded) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, 'true');
        window.location.reload();
      }
    }
  });
}
