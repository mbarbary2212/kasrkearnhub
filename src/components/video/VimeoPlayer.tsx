import { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoProgress } from '@/hooks/useVideoProgress';
import { Button } from '@/components/ui/button';
import { RotateCcw, Play } from 'lucide-react';
import { logDiagnostic } from '@/lib/stabilityGuards';

interface VimeoPlayerProps {
  videoId: string;
  /** Privacy hash for unlisted/private videos (the ?h= parameter) */
  privacyHash?: string | null;
  className?: string;
  autoplay?: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  /** Called when a load error occurs (403/404/private video) to trigger watchdog */
  onLoadError?: () => void;
}

declare global {
  interface Window {
    Vimeo?: {
      Player: new (element: HTMLIFrameElement, options?: Record<string, unknown>) => VimeoPlayerInstance;
    };
  }
}

interface VimeoPlayerInstance {
  on: (event: string, callback: (data?: unknown) => void) => void;
  off: (event: string, callback?: (data?: unknown) => void) => void;
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
  setCurrentTime: (seconds: number) => Promise<number>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => void;
}

// Format seconds to mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Track if Vimeo SDK is loading
let vimeoSDKPromise: Promise<void> | null = null;

function loadVimeoSDK(): Promise<void> {
  if (window.Vimeo?.Player) {
    return Promise.resolve();
  }

  if (vimeoSDKPromise) {
    return vimeoSDKPromise;
  }

  vimeoSDKPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Vimeo SDK'));
    document.head.appendChild(script);
  });

  return vimeoSDKPromise;
}

// Export for pre-loading before user clicks play
export function preloadVimeoSDK(): void {
  loadVimeoSDK().catch(() => {
    // Silently fail - will retry when player loads
  });
}

export function VimeoPlayer({
  videoId,
  privacyHash,
  className = '',
  autoplay = false,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  onLoadError,
}: VimeoPlayerProps) {
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayerInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [showTapToPlay, setShowTapToPlay] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const durationRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const { fetchProgress, saveProgress, markComplete, resetProgress } = useVideoProgress(videoId);

  // Handle start over action
  const handleStartOver = useCallback(async () => {
    setShowResumeToast(false);
    if (playerRef.current) {
      await resetProgress(durationRef.current);
      await playerRef.current.setCurrentTime(0);
      currentTimeRef.current = 0;
      playerRef.current.play();
    }
  }, [resetProgress]);

  // Initialize player
  useEffect(() => {
    isMountedRef.current = true;

    const initPlayer = async () => {
      try {
        await loadVimeoSDK();

        if (!iframeRef.current || !window.Vimeo?.Player || !isMountedRef.current) return;

        const player = new window.Vimeo.Player(iframeRef.current);
        playerRef.current = player;

        // Handle loaded event
        player.on('loaded', async () => {
          if (!isMountedRef.current) return;

          try {
            const duration = await player.getDuration();
            durationRef.current = duration;

            // Fetch saved progress
            const progress = await fetchProgress();

            if (progress) {
              const lastTime = progress.last_time_seconds;
              const nearEnd = duration > 0 && lastTime >= duration - 10;
              const alreadyComplete = progress.percent_watched >= 95;

              // Only resume if:
              // - lastTime > 5 seconds
              // - Not near the end (would indicate completion)
              // - Not already marked complete
              if (lastTime > 5 && !nearEnd && !alreadyComplete) {
                await player.setCurrentTime(lastTime);
                currentTimeRef.current = lastTime;
                setResumeTime(lastTime);
                setShowResumeToast(true);
                
                // Auto-hide toast after 5 seconds
                setTimeout(() => {
                  if (isMountedRef.current) {
                    setShowResumeToast(false);
                  }
                }, 5000);
              }
            }

            setIsReady(true);
            onReady?.();
          } catch (e) {
            console.error('Error during player load:', e);
            logDiagnostic('video', 'Vimeo player load error', { videoId, error: String(e) });
            onError?.(e instanceof Error ? e : new Error(String(e)));
          }
        });

        // Handle player error - detect autoplay failures and HTTP errors
        player.on('error', (data: unknown) => {
          const errorData = data as { message?: string; name?: string } | undefined;
          logDiagnostic('video', 'Vimeo player error event', { videoId, error: errorData });
          
          const errorMessage = errorData?.message?.toLowerCase() || '';
          
          // Check for HTTP errors (403/404) or access denied - trigger watchdog
          if (errorMessage.includes('403') || 
              errorMessage.includes('404') ||
              errorMessage.includes('not found') ||
              errorMessage.includes('private') ||
              errorMessage.includes('privacy') ||
              errorMessage.includes('forbidden')) {
            onLoadError?.();
            onError?.(new Error(errorData?.message || 'Video access denied'));
            return;
          }
          
          // Check if this is an autoplay error (NotAllowedError)
          if (errorData?.name === 'NotAllowedError' || errorMessage.includes('autoplay')) {
            if (isMountedRef.current && autoplay) {
              setShowTapToPlay(true);
            }
          } else {
            onError?.(new Error(errorData?.message || 'Vimeo player error'));
          }
        });

        // Handle timeupdate for progress saving
        player.on('timeupdate', async (data: unknown) => {
          if (!isMountedRef.current) return;
          const { seconds } = data as { seconds: number };
          
          // Track current time for unmount save
          currentTimeRef.current = seconds;
          
          if (durationRef.current > 0) {
            await saveProgress(seconds, durationRef.current);
          }
        });

        // Handle play
        player.on('play', () => {
          onPlay?.();
        });

        // Handle pause - force save current position
        player.on('pause', async () => {
          if (!isMountedRef.current) return;
          onPause?.();
          try {
            const currentTime = await player.getCurrentTime();
            currentTimeRef.current = currentTime;
            if (durationRef.current > 0 && currentTime > 0) {
              await saveProgress(currentTime, durationRef.current, true);
            }
          } catch (e) {
            console.error('Error saving on pause:', e);
          }
        });

        // Handle ended - check if truly complete before resetting
        player.on('ended', async () => {
          if (!isMountedRef.current) return;
          onEnded?.();
          
          try {
            const currentTime = await player.getCurrentTime();
            if (durationRef.current > 0) {
              // markComplete will check if truly finished (>=95%) before resetting
              await markComplete(currentTime, durationRef.current);
            }
          } catch (e) {
            console.error('Error on video end:', e);
          }
        });

      } catch (error) {
        console.error('Error initializing Vimeo player:', error);
        logDiagnostic('video', 'Vimeo SDK init failed', { videoId, error: String(error) });
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initPlayer();

    // Save on beforeunload
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 0 && durationRef.current > 0) {
        // Use sendBeacon for reliable save on page unload
        // Fall back to sync save since we can't await
        saveProgress(currentTimeRef.current, durationRef.current, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Force save on unmount with current tracked time
      if (currentTimeRef.current > 0 && durationRef.current > 0) {
        saveProgress(currentTimeRef.current, durationRef.current, true);
      }
      
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Player might already be destroyed
        }
        playerRef.current = null;
      }
    };
  }, [videoId, fetchProgress, saveProgress, markComplete, onReady, onPlay, onPause, onEnded]);

  // Build embed URL with privacy hash and necessary parameters
  // Use URLSearchParams to properly construct query string
  const buildEmbedUrl = () => {
    const params = new URLSearchParams();
    
    // Privacy hash MUST be first for unlisted videos
    if (privacyHash) {
      params.set('h', privacyHash);
    }
    
    if (autoplay) {
      params.set('autoplay', '1');
      // Muted required for autoplay on mobile browsers
      params.set('muted', '1');
    }
    
    params.set('playsinline', '1');
    params.set('dnt', '1');
    
    return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
  };
  
  const embedUrl = buildEmbedUrl();

  return (
    <div className={`relative w-full ${className}`}>
      <div className="aspect-video w-full bg-muted">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Vimeo video player"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      {/* Tap to play overlay for mobile autoplay failures */}
      {showTapToPlay && (
        <button
          onClick={() => {
            setShowTapToPlay(false);
            if (playerRef.current) {
              playerRef.current.play().catch(() => {
                // If play still fails, user may need to interact directly with iframe
              });
            }
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors hover:bg-black/50"
          aria-label="Tap to play video"
        >
          <div className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-colors shadow-lg">
            <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </button>
      )}

      {/* Resume toast */}
      {showResumeToast && !showTapToPlay && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 p-3 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg animate-in slide-in-from-bottom-2 duration-300">
          <span className="text-sm text-foreground">
            Resuming from {formatTime(resumeTime)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartOver}
            className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start over
          </Button>
        </div>
      )}
    </div>
  );
}

export default VimeoPlayer;
