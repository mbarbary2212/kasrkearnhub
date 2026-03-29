import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Set of video IDs the user has manually unmarked this session */
export const manuallyUnmarkedIds = new Set<string>();

export function useManualVideoComplete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['video-watched', user?.id],
    queryFn: async () => {
      if (!user) return { watchedIds: new Set<string>(), percentMap: new Map<string, number>() };
      const { data, error } = await supabase
        .from('video_progress')
        .select('video_id, percent_watched')
        .eq('user_id', user.id);
      if (error) throw error;
      const watchedIds = new Set<string>();
      const percentMap = new Map<string, number>();
      for (const row of data) {
        percentMap.set(row.video_id, Number(row.percent_watched));
        if (Number(row.percent_watched) >= 95 && !manuallyUnmarkedIds.has(row.video_id)) {
          watchedIds.add(row.video_id);
        }
      }
      return { watchedIds, percentMap };
    },
    enabled: !!user,
  });

  const watchedIds = data?.watchedIds ?? new Set<string>();
  const percentMap = data?.percentMap ?? new Map<string, number>();

  const markWatched = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('Not authenticated');
      manuallyUnmarkedIds.delete(videoId);
      const { error } = await supabase.from('video_progress').upsert(
        {
          user_id: user.id,
          video_id: videoId,
          percent_watched: 100,
          last_time_seconds: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,video_id' }
      );
      if (error) throw error;
    },
    onMutate: async (videoId: string) => {
      await queryClient.cancelQueries({ queryKey: ['video-watched', user?.id] });
      const prev = queryClient.getQueryData(['video-watched', user?.id]);
      queryClient.setQueryData(['video-watched', user?.id], (old: typeof data) => {
        if (!old) return old;
        const newWatched = new Set(old.watchedIds);
        newWatched.add(videoId);
        const newPercent = new Map(old.percentMap);
        newPercent.set(videoId, 100);
        return { watchedIds: newWatched, percentMap: newPercent };
      });
      return { prev };
    },
    onError: (_err, _vid, context) => {
      if (context?.prev) queryClient.setQueryData(['video-watched', user?.id], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-watched'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
    },
  });

  const unmarkWatched = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('Not authenticated');
      manuallyUnmarkedIds.add(videoId);
      const { error } = await supabase.from('video_progress').upsert(
        {
          user_id: user.id,
          video_id: videoId,
          percent_watched: 0,
          last_time_seconds: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,video_id' }
      );
      if (error) throw error;
    },
    onMutate: async (videoId: string) => {
      await queryClient.cancelQueries({ queryKey: ['video-watched', user?.id] });
      const prev = queryClient.getQueryData(['video-watched', user?.id]);
      queryClient.setQueryData(['video-watched', user?.id], (old: typeof data) => {
        if (!old) return old;
        const newWatched = new Set(old.watchedIds);
        newWatched.delete(videoId);
        const newPercent = new Map(old.percentMap);
        newPercent.set(videoId, 0);
        return { watchedIds: newWatched, percentMap: newPercent };
      });
      return { prev };
    },
    onError: (_err, _vid, context) => {
      if (context?.prev) queryClient.setQueryData(['video-watched', user?.id], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-watched'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
    },
  });

  return { watchedIds, percentMap, markWatched, unmarkWatched };
}
