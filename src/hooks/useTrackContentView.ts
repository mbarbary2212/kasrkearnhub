import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface TrackContentViewParams {
  contentType: string;
  contentId: string;
  chapterId?: string;
  topicId?: string;
}

export function useTrackContentView() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentType, contentId, chapterId, topicId }: TrackContentViewParams) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('content_views')
        .upsert(
          {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            chapter_id: chapterId || null,
            topic_id: topicId || null,
          },
          { onConflict: 'user_id,content_type,content_id', ignoreDuplicates: true }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
      queryClient.invalidateQueries({ queryKey: ['content-progress'] });
    },
  });
}
