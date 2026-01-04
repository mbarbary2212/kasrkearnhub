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
  const hasRestoredRef = useRef(false);
  const isMountedRef = useRef(true);

  const { fetchProgress, saveProgress, markComplete, resetProgress } = useVideoProgress(videoId);

  // Handle start over action
  const handleStartOver = useCallback(async () => {
    setShowResumeToast(false);
    if (playerRef.current && durationRef.current > 0) {
      await resetProgress(durationRef.current);
      await playerRef.current.setCurrentTime(0);
      playerRef.current.play();
    }
  }, [resetProgress]);

  // Initialize player
  useEffect(() => {
    isMountedRef.current = true;
    hasRestoredRef.current = false;

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

            if (
              progress &&
              progress.last_time_seconds > 5 &&
              progress.last_time_seconds < duration - 5
            ) {
              // Resume from saved position
              await player.setCurrentTime(progress.last_time_seconds);
              setResumeTime(progress.last_time_seconds);
              setShowResumeToast(true);
              hasRestoredRef.current = true;
              
              // Auto-hide toast after 5 seconds
              setTimeout(() => {
                if (isMountedRef.current) {
                  setShowResumeToast(false);
                }
              }, 5000);
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
          if (durationRef.current > 0) {
            await saveProgress(seconds, durationRef.current);
          }
        });

        // Handle play
        player.on('play', () => {
          onPlay?.();
        });

        // Handle pause - force save
        player.on('pause', async () => {
          if (!isMountedRef.current) return;
          onPause?.();
          try {
            const currentTime = await player.getCurrentTime();
            if (durationRef.current > 0) {
              await saveProgress(currentTime, durationRef.current, true);
            }
          } catch (e) {
            console.error('Error saving on pause:', e);
          }
        });

        // Handle ended - mark complete and reset
        player.on('ended', async () => {
          if (!isMountedRef.current) return;
          onEnded?.();
          if (durationRef.current > 0) {
            await markComplete(durationRef.current);
          }
        });

      } catch (error) {
        console.error('Error initializing Vimeo player:', error);
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      // Force save on unmount
      if (playerRef.current && durationRef.current > 0) {
        playerRef.current.getCurrentTime().then((time) => {
          saveProgress(time, durationRef.current, true);
        }).catch(() => {});
        
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, fetchProgress, saveProgress, markComplete, onReady, onPlay, onPause, onEnded]);

  // Build embed URL with necessary parameters
  const embedUrl = `https://player.vimeo.com/video/${videoId}?${autoplay ? 'autoplay=1&muted=1&' : ''}playsinline=1`;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="aspect-video w-full bg-muted">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
