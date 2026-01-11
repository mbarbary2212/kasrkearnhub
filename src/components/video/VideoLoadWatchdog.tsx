import { useState, useEffect, useCallback, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logDiagnostic } from '@/lib/stabilityGuards';

interface VideoLoadWatchdogProps {
  /** Unique key to force remount on retry */
  videoKey: string;
  /** Whether the video player has signaled it's ready */
  isReady: boolean;
  /** Timeout in milliseconds before showing error (default: 5000) */
  timeoutMs?: number;
  /** URL to open in new tab */
  externalUrl?: string;
  /** Signal that a load error occurred (403/404/etc) - triggers immediate retry UI */
  hasError?: boolean;
  /** Callback to trigger retry (remount) */
  onRetry: () => void;
  /** The video player component */
  children: ReactNode;
}

/**
 * Video Load Watchdog
 * Wraps video players and monitors for load failures
 * Shows recovery UI if player doesn't become ready within timeout
 */
export function VideoLoadWatchdog({
  videoKey,
  isReady,
  timeoutMs = 5000,
  externalUrl,
  hasError = false,
  onRetry,
  children,
}: VideoLoadWatchdogProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset timeout state when key changes (new video or retry)
  useEffect(() => {
    setHasTimedOut(false);
  }, [videoKey, retryCount]);

  // Immediately trigger error state when hasError prop is set
  useEffect(() => {
    if (hasError && !isReady) {
      setHasTimedOut(true);
      logDiagnostic('video', 'Video load error detected via hasError prop', {
        videoKey,
        retryCount,
      });
    }
  }, [hasError, isReady, videoKey, retryCount]);

  // Start watchdog timer
  useEffect(() => {
    // Don't start timer if already ready
    if (isReady) {
      return;
    }

    const timer = setTimeout(() => {
      if (!isReady) {
        setHasTimedOut(true);
        logDiagnostic('video', 'Video load timeout', {
          videoKey,
          timeoutMs,
          retryCount,
        });
      }
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isReady, videoKey, timeoutMs, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    setHasTimedOut(false);
    onRetry();
  }, [onRetry]);

  const handleOpenExternal = useCallback(() => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  }, [externalUrl]);

  // Show error overlay if timed out
  if (hasTimedOut && !isReady) {
    return (
      <div className="relative w-full">
        {/* Keep the player in DOM but overlay it */}
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
        
        {/* Error overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="text-center space-y-4 p-6 max-w-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">
                Video Failed to Load
              </h3>
              <p className="text-sm text-muted-foreground">
                Refresh or Retry usually fixes this.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={handleRetry}
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
              
              {externalUrl && (
                <Button
                  onClick={handleOpenExternal}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default VideoLoadWatchdog;
