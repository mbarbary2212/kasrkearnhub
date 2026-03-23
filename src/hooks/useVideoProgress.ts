import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VideoProgress {
  last_time_seconds: number;
  duration_seconds: number | null;
  percent_watched: number;
  updated_at: string;
}

const LOCAL_STORAGE_PREFIX = 'video_progress:';
const COMPLETION_THRESHOLD = 95; // percent
const PROGRESS_INVALIDATION_THRESHOLD = 10; // percent change to trigger invalidation

export function useVideoProgress(videoId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSavedTime = useRef<number>(0);
  const lastSaveTimestamp = useRef<number>(0);
  const lastInvalidatedPercent = useRef<number>(0);

  const getLocalProgress = useCallback((vid: string): VideoProgress | null => {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${vid}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading local video progress:', e);
    }
    return null;
  }, []);

  const setLocalProgress = useCallback((vid: string, progress: VideoProgress) => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${vid}`, JSON.stringify(progress));
    } catch (e) {
      console.error('Error saving local video progress:', e);
    }
  }, []);

  const fetchProgress = useCallback(async (): Promise<VideoProgress | null> => {
    if (!videoId) return null;

    // If user is logged in, fetch from Supabase
    if (user) {
      const { data, error } = await supabase
        .from('video_progress')
        .select('last_time_seconds, duration_seconds, percent_watched, updated_at')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching video progress:', error);
        return null;
      }

      if (data) {
        return {
          last_time_seconds: Number(data.last_time_seconds),
          duration_seconds: data.duration_seconds ? Number(data.duration_seconds) : null,
          percent_watched: Number(data.percent_watched),
          updated_at: data.updated_at,
        };
      }

      // Check if there's local progress to migrate
      const localProgress = getLocalProgress(videoId);
      if (localProgress && localProgress.last_time_seconds > 0) {
        // Migrate local progress to Supabase
        await saveProgress(localProgress.last_time_seconds, localProgress.duration_seconds || 0, true);
        // Clear local storage after migration
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${videoId}`);
        return localProgress;
      }

      return null;
    }

    // User not logged in, use localStorage
    return getLocalProgress(videoId);
  }, [videoId, user, getLocalProgress]);

  const saveProgress = useCallback(async (
    currentTime: number,
    duration: number,
    forceSave = false
  ): Promise<void> => {
    if (!videoId) return;
    
    // Guard against invalid values
    if (typeof currentTime !== 'number' || isNaN(currentTime)) return;
    if (currentTime < 0) return;

    const now = Date.now();
    const timeDiff = Math.abs(currentTime - lastSavedTime.current);
    const elapsedSinceLastSave = now - lastSaveTimestamp.current;

    // Throttle: save every 5 seconds OR if time changed by >=5 seconds
    if (!forceSave && timeDiff < 5 && elapsedSinceLastSave < 5000) {
      return;
    }

    lastSavedTime.current = currentTime;
    lastSaveTimestamp.current = now;

    // Compute percent only if we have valid duration
    let percentWatched = 0;
    if (duration > 0 && !isNaN(duration)) {
      percentWatched = Math.min(100, (currentTime / duration) * 100);
    }

    const progress: VideoProgress = {
      last_time_seconds: currentTime,
      duration_seconds: duration > 0 ? duration : null,
      percent_watched: percentWatched,
      updated_at: new Date().toISOString(),
    };

    if (user) {
      // Save to Supabase using upsert
      const { error } = await supabase
        .from('video_progress')
        .upsert(
          {
            user_id: user.id,
            video_id: videoId,
            last_time_seconds: currentTime,
            duration_seconds: duration > 0 ? duration : null,
            percent_watched: percentWatched,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,video_id' }
        );

      if (error) {
        console.error('Error saving video progress:', error);
      } else {
        // Invalidate chapter progress queries periodically to update progress bar
        // Only invalidate if percent changed significantly (every 10%) to avoid excessive updates
        const percentDiff = Math.abs(percentWatched - lastInvalidatedPercent.current);
        if (percentDiff >= PROGRESS_INVALIDATION_THRESHOLD || percentWatched >= 80) {
          lastInvalidatedPercent.current = percentWatched;
          queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
        }
      }
    } else {
      // Save to localStorage
      setLocalProgress(videoId, progress);
    }
  }, [videoId, user, setLocalProgress, queryClient]);

  // Mark video as complete - only resets if truly finished (>=95%)
  const markComplete = useCallback(async (
    currentTime: number,
    duration: number
  ): Promise<void> => {
    if (!videoId || duration <= 0) return;

    const percentWatched = (currentTime / duration) * 100;
    const nearEnd = currentTime >= duration - 10;
    const isComplete = percentWatched >= COMPLETION_THRESHOLD || nearEnd;

    if (isComplete) {
      // Truly completed - reset to 0 for next viewing
      const progress: VideoProgress = {
        last_time_seconds: 0,
        duration_seconds: duration,
        percent_watched: 100,
        updated_at: new Date().toISOString(),
      };

      if (user) {
        const { error } = await supabase
          .from('video_progress')
          .upsert(
            {
              user_id: user.id,
              video_id: videoId,
              last_time_seconds: 0,
              duration_seconds: duration,
              percent_watched: 100,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,video_id' }
          );

        if (error) {
          console.error('Error marking video complete:', error);
        } else {
          // Invalidate chapter progress to update UI
          queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
        }
      } else {
        setLocalProgress(videoId, progress);
      }
    } else {
      // Not truly finished - just save current position
      await saveProgress(currentTime, duration, true);
    }
  }, [videoId, user, setLocalProgress, saveProgress, queryClient]);

  // Explicit reset (user clicked "Start over")
  const resetProgress = useCallback(async (duration: number): Promise<void> => {
    if (!videoId) return;

    // Reset refs to allow immediate new saves
    lastSavedTime.current = 0;
    lastSaveTimestamp.current = 0;

    const progress: VideoProgress = {
      last_time_seconds: 0,
      duration_seconds: duration > 0 ? duration : null,
      percent_watched: 0,
      updated_at: new Date().toISOString(),
    };

    if (user) {
      const { error } = await supabase
        .from('video_progress')
        .upsert(
          {
            user_id: user.id,
            video_id: videoId,
            last_time_seconds: 0,
            duration_seconds: duration > 0 ? duration : null,
            percent_watched: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,video_id' }
        );

      if (error) {
        console.error('Error resetting video progress:', error);
      }
    } else {
      setLocalProgress(videoId, progress);
    }
  }, [videoId, user, setLocalProgress]);

  // Migrate localStorage progress to Supabase when user logs in
  useEffect(() => {
    if (!user || !videoId) return;

    const localProgress = getLocalProgress(videoId);
    if (localProgress && localProgress.last_time_seconds > 0) {
      // Check if Supabase already has progress
      supabase
        .from('video_progress')
        .select('last_time_seconds')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) {
            // No Supabase progress, migrate local
            saveProgress(localProgress.last_time_seconds, localProgress.duration_seconds || 0, true);
            localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${videoId}`);
          }
        });
    }
  }, [user, videoId, getLocalProgress, saveProgress]);

  return {
    fetchProgress,
    saveProgress,
    markComplete,
    resetProgress,
  };
}
