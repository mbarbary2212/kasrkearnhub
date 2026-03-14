import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RatingAggregates {
  thumbsUp: number;
  thumbsDown: number;
}

export function useVideoRatings(videoIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sortedKey = videoIds.sort().join(',');

  // User's own ratings
  const { data: userRatings = new Map<string, number>() } = useQuery({
    queryKey: ['video-ratings-user', user?.id, sortedKey],
    queryFn: async () => {
      if (!user || videoIds.length === 0) return new Map<string, number>();
      const { data, error } = await supabase
        .from('video_ratings')
        .select('video_id, rating')
        .eq('user_id', user.id)
        .in('video_id', videoIds);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data) map.set(row.video_id, row.rating);
      return map;
    },
    enabled: !!user && videoIds.length > 0,
  });

  // Aggregate ratings for all videos
  const { data: aggregates = new Map<string, RatingAggregates>() } = useQuery({
    queryKey: ['video-ratings-agg', sortedKey],
    queryFn: async () => {
      if (videoIds.length === 0) return new Map<string, RatingAggregates>();
      const { data, error } = await supabase
        .from('video_ratings')
        .select('video_id, rating')
        .in('video_id', videoIds);
      if (error) throw error;
      const map = new Map<string, RatingAggregates>();
      for (const row of data) {
        const existing = map.get(row.video_id) || { thumbsUp: 0, thumbsDown: 0 };
        if (row.rating === 1) existing.thumbsUp++;
        else existing.thumbsDown++;
        map.set(row.video_id, existing);
      }
      return map;
    },
    enabled: videoIds.length > 0,
  });

  const rateVideo = useMutation({
    mutationFn: async ({ videoId, rating }: { videoId: string; rating: 1 | -1 }) => {
      if (!user) throw new Error('Not authenticated');
      const currentRating = userRatings.get(videoId);
      if (currentRating === rating) {
        // Toggle off
        const { error } = await supabase
          .from('video_ratings')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        if (error) throw error;
      } else {
        // Upsert
        const { error } = await supabase.from('video_ratings').upsert(
          { user_id: user.id, video_id: videoId, rating },
          { onConflict: 'user_id,video_id' }
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-ratings-user'] });
      queryClient.invalidateQueries({ queryKey: ['video-ratings-agg'] });
    },
  });

  return { userRatings, aggregates, rateVideo };
}
