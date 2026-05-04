import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { manuallyUnmarkedIds } from '@/hooks/useManualVideoComplete';

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  startTime?: number;
  onReady?: () => void;
  onTimeUpdate?: (seconds: number) => void;
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
const SECTION_START_LEAD_SECONDS = 1.5;

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

export function YouTubePlayer({ videoId, title, startTime, onReady, onTimeUpdate }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const clearTimeInterval = useCallback(() => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  }, []);

  const saveProgress = useCallback(
    async (currentTime: number, duration: number, percentWatched: number) => {
      const u = userRef.current;
      if (!u) return;
      // Don't overwrite if user manually unmarked this video
      if (manuallyUnmarkedIds.has(videoId)) return;

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
    },
    [videoId]
  );

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
            onReadyRef.current?.();
            const sectionStart = startTimeRef.current ?? 0;

            if (sectionStart > 0) {
              const adjustedSectionStart = Math.max(0, sectionStart - SECTION_START_LEAD_SECONDS);
              event.target.seekTo(adjustedSectionStart, true);
              onTimeUpdateRef.current?.(adjustedSectionStart);
              return;
            }

            const u = userRef.current;
            if (!u) {
              onTimeUpdateRef.current?.(0);
              return;
            }

            const { data } = await supabase
              .from('video_progress')
              .select('last_time_seconds, percent_watched')
              .eq('user_id', u.id)
              .eq('video_id', videoId)
              .maybeSingle();

            const savedTime = data ? Number(data.last_time_seconds) : 0;
            const pctWatched = data ? Number(data.percent_watched) : 0;

            // Resume saved progress only when no section-specific start was requested.
            if (savedTime > 10 && pctWatched < 95) {
              event.target.seekTo(savedTime, true);
              onTimeUpdateRef.current?.(savedTime);
            } else {
              onTimeUpdateRef.current?.(0);
            }
          },
          onStateChange: (event: YTPlayerEvent) => {
            const player = event.target;
            const state = event.data;

            if (state === YT.PlayerState.PLAYING) {
              clearProgressInterval();
              clearTimeInterval();

              onTimeUpdateRef.current?.(player.getCurrentTime());

              progressIntervalRef.current = setInterval(() => {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();

                if (duration > 0) {
                  const percent = (currentTime / duration) * 100;
                  saveProgress(currentTime, duration, percent);
                }
              }, 10000);

              timeIntervalRef.current = setInterval(() => {
                onTimeUpdateRef.current?.(player.getCurrentTime());
              }, 1000);
            } else if (state === YT.PlayerState.PAUSED) {
              clearProgressInterval();
              clearTimeInterval();

              const currentTime = player.getCurrentTime();
              const duration = player.getDuration();
              onTimeUpdateRef.current?.(currentTime);

              if (duration > 0) {
                saveProgress(currentTime, duration, (currentTime / duration) * 100);
              }
            } else if (state === YT.PlayerState.ENDED) {
              clearProgressInterval();
              clearTimeInterval();

              const duration = player.getDuration();
              onTimeUpdateRef.current?.(duration);
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
      clearTimeInterval();

      try {
        playerRef.current?.destroy();
      } catch {
        // no-op
      }

      playerRef.current = null;
    };
  }, [videoId, clearProgressInterval, clearTimeInterval, saveProgress]);

  return (
    <div className="aspect-video w-full bg-black">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
