import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
        if (Number(row.percent_watched) >= 95) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-watched'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
    },
  });

  const unmarkWatched = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('video_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-watched'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
    },
  });

  return { watchedIds, percentMap, markWatched, unmarkWatched };
}
