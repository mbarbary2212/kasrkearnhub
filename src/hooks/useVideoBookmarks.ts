import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useVideoBookmarks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookmarkedIds = new Set<string>() } = useQuery({
    queryKey: ['video-bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from('user_bookmarks')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'video');
      if (error) throw error;
      return new Set(data.map((r) => r.item_id));
    },
    enabled: !!user,
  });

  const addBookmark = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('user_bookmarks').insert({
        user_id: user.id,
        item_type: 'video',
        item_id: videoId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video-bookmarks'] }),
  });

  const removeBookmark = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', 'video')
        .eq('item_id', videoId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video-bookmarks'] }),
  });

  return { bookmarkedIds, addBookmark, removeBookmark };
}
