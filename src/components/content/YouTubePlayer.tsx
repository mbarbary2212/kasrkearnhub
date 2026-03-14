import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  onReady?: () => void;
}

// Minimal YT type declarations
interface YTPlayer {
  destroy(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  unMute(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data?: number;
}

interface YTPlayerConstructor {
  new (element: HTMLElement, options: Record<string, unknown>): YTPlayer;
}

interface YTNamespace {
  Player: YTPlayerConstructor;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
    BUFFERING: number;
  };
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}

export function YouTubePlayer({ videoId, title, onReady }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const clearProgressInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const saveProgress = useCallback(async (currentTime: number, duration: number, percentWatched: number) => {
    const u = userRef.current;
    if (!u) return;
    await supabase.from('video_progress').upsert(
      {
        user_id: u.id,
        video_id: videoId,
        last_time_seconds: Math.floor(currentTime),
        duration_seconds: Math.floor(duration),
        percent_watched: Math.min(100, percentWatched),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,video_id' }
    );
  }, [videoId]);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      await loadYouTubeAPI();
      if (destroyed || !containerRef.current) return;

      const el = document.createElement('div');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(el);

      const YT = window.YT;

      playerRef.current = new YT.Player(el, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: async (event: YTPlayerEvent) => {
            onReady?.();
            const u = userRef.current;
            if (!u) return;
            const { data } = await supabase
              .from('video_progress')
              .select('last_time_seconds, percent_watched')
              .eq('user_id', u.id)
              .eq('video_id', videoId)
              .maybeSingle();

            if (data && Number(data.last_time_seconds) > 10 && Number(data.percent_watched) < 95) {
              const seekTo = Number(data.last_time_seconds);
              console.log(`Resume playback: seeking to ${seekTo}s`);
              event.target.seekTo(seekTo, true);
              event.target.unMute();
            }
          },
          onStateChange: (event: YTPlayerEvent) => {
            const player = event.target;
            const state = event.data;
            if (state === YT.PlayerState.PLAYING) {
              clearProgressInterval();
              intervalRef.current = setInterval(() => {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();
                if (duration > 0) {
                  const percent = (currentTime / duration) * 100;
                  saveProgress(currentTime, duration, percent);
                }
              }, 10000);
            } else if (state === YT.PlayerState.PAUSED) {
              clearProgressInterval();
              const currentTime = player.getCurrentTime();
              const duration = player.getDuration();
              if (duration > 0) {
                saveProgress(currentTime, duration, (currentTime / duration) * 100);
              }
            } else if (state === YT.PlayerState.ENDED) {
              clearProgressInterval();
              const duration = player.getDuration();
              saveProgress(0, duration, 100);
            }
          },
        },
      } as Record<string, unknown>);
    }

    init();

    return () => {
      destroyed = true;
      clearProgressInterval();
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
    };
  }, [videoId, clearProgressInterval, saveProgress, onReady]);

  return (
    <div className="aspect-video w-full bg-black">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
