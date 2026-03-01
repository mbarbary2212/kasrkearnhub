import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logDiagnostic } from '@/lib/stabilityGuards';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary - catches all uncaught runtime errors
 * Shows a user-friendly fallback UI with recovery options
 * Separate from ChunkLoadErrorBoundary to handle non-chunk errors
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error without exposing details to users
    logDiagnostic('runtime', 'Uncaught runtime error', {
      errorMessage: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 500), // Truncate for logging
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            {/* Error message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Something Went Wrong
              </h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. This is usually temporary and can be fixed by refreshing the page.
              </p>
            </div>

            {/* Recovery actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.handleReload}
                size="lg"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </Button>
            </div>

            {/* Help text */}
            <p className="text-xs text-muted-foreground">
              If this keeps happening, try clearing your browser cache or using a different browser.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
