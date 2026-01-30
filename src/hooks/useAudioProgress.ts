import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AudioProgress {
  last_position_seconds: number;
  duration_seconds: number | null;
  progress_seconds: number;
  percent_listened: number;
  play_count: number;
  completed: boolean;
  updated_at: string;
}

const COMPLETION_THRESHOLD = 90; // percent
const SAVE_THROTTLE_MS = 5000; // 5 seconds

export function useAudioProgress(resourceId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSavedTime = useRef<number>(0);
  const lastSaveTimestamp = useRef<number>(0);
  const playCountIncremented = useRef<boolean>(false);

  const fetchProgress = useCallback(async (): Promise<AudioProgress | null> => {
    if (!resourceId || !user) return null;

    const { data, error } = await supabase
      .from('audio_progress')
      .select('last_position_seconds, duration_seconds, progress_seconds, percent_listened, play_count, completed, updated_at')
      .eq('user_id', user.id)
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching audio progress:', error);
      return null;
    }

    if (data) {
      return {
        last_position_seconds: data.last_position_seconds,
        duration_seconds: data.duration_seconds,
        progress_seconds: data.progress_seconds,
        percent_listened: data.percent_listened,
        play_count: data.play_count,
        completed: data.completed,
        updated_at: data.updated_at,
      };
    }

    return null;
  }, [resourceId, user]);

  const saveProgress = useCallback(async (
    currentTime: number,
    duration: number,
    forceSave = false
  ): Promise<void> => {
    if (!resourceId || !user) return;

    // Guard against invalid values
    if (typeof currentTime !== 'number' || isNaN(currentTime)) return;
    if (currentTime < 0) return;

    const now = Date.now();
    const timeDiff = Math.abs(currentTime - lastSavedTime.current);
    const elapsedSinceLastSave = now - lastSaveTimestamp.current;

    // Throttle: save every 5 seconds OR if time changed by >=5 seconds
    if (!forceSave && timeDiff < 5 && elapsedSinceLastSave < SAVE_THROTTLE_MS) {
      return;
    }

    lastSavedTime.current = currentTime;
    lastSaveTimestamp.current = now;

    // Compute percent only if we have valid duration
    let percentListened = 0;
    if (duration > 0 && !isNaN(duration)) {
      percentListened = Math.min(100, (currentTime / duration) * 100);
    }

    // Increment play count on first save of a session
    const incrementPlayCount = !playCountIncremented.current;
    if (incrementPlayCount) {
      playCountIncremented.current = true;
    }

    // Fetch current progress to get existing play_count
    const { data: existing } = await supabase
      .from('audio_progress')
      .select('play_count, progress_seconds')
      .eq('user_id', user.id)
      .eq('resource_id', resourceId)
      .maybeSingle();

    const currentPlayCount = existing?.play_count || 0;
    const existingProgressSeconds = existing?.progress_seconds || 0;
    // Track max progress (don't decrement if user seeks backwards)
    const newProgressSeconds = Math.max(existingProgressSeconds, Math.round(currentTime));

    const { error } = await supabase
      .from('audio_progress')
      .upsert(
        {
          user_id: user.id,
          resource_id: resourceId,
          last_position_seconds: Math.round(currentTime),
          duration_seconds: duration > 0 ? Math.round(duration) : null,
          progress_seconds: newProgressSeconds,
          percent_listened: percentListened,
          play_count: incrementPlayCount ? currentPlayCount + 1 : currentPlayCount,
          completed: percentListened >= COMPLETION_THRESHOLD,
        },
        { onConflict: 'user_id,resource_id' }
      );

    if (error) {
      console.error('Error saving audio progress:', error);
    }
  }, [resourceId, user]);

  const markComplete = useCallback(async (
    currentTime: number,
    duration: number
  ): Promise<boolean> => {
    if (!resourceId || !user || duration <= 0) return false;

    const percentListened = (currentTime / duration) * 100;
    const nearEnd = currentTime >= duration - 5;
    const isComplete = percentListened >= COMPLETION_THRESHOLD || nearEnd;

    if (isComplete) {
      // Fetch existing to get play_count
      const { data: existing } = await supabase
        .from('audio_progress')
        .select('play_count')
        .eq('user_id', user.id)
        .eq('resource_id', resourceId)
        .maybeSingle();

      const { error } = await supabase
        .from('audio_progress')
        .upsert(
          {
            user_id: user.id,
            resource_id: resourceId,
            last_position_seconds: 0, // Reset for next listening
            duration_seconds: Math.round(duration),
            progress_seconds: Math.round(duration),
            percent_listened: 100,
            play_count: existing?.play_count || 1,
            completed: true,
          },
          { onConflict: 'user_id,resource_id' }
        );

      if (error) {
        console.error('Error marking audio complete:', error);
        return false;
      }

      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['audio-progress'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
      
      return true;
    }

    return false;
  }, [resourceId, user, queryClient]);

  const resetPlayCountFlag = useCallback(() => {
    playCountIncremented.current = false;
  }, []);

  return {
    fetchProgress,
    saveProgress,
    markComplete,
    resetPlayCountFlag,
  };
}
