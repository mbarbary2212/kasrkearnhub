import { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoProgress } from '@/hooks/useVideoProgress';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface VimeoPlayerProps {
  videoId: string;
  className?: string;
  autoplay?: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
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

export function VimeoPlayer({
  videoId,
  className = '',
  autoplay = false,
  onReady,
  onPlay,
  onPause,
  onEnded,
}: VimeoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayerInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);
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

  // Build embed URL with necessary parameters
  const embedUrl = `https://player.vimeo.com/video/${videoId}?${autoplay ? 'autoplay=1&' : ''}playsinline=1&dnt=1`;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="aspect-video w-full bg-muted">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Vimeo video player"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Resume toast */}
      {showResumeToast && (
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
