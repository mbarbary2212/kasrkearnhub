import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useTrackContentView() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentType, contentId, chapterId }) => {
      if (!user?.id) return;

      await supabase
        .from('content_views')
        .upsert(
          {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            chapter_id: chapterId,
          },
          {
            onConflict: 'user_id,content_type,content_id',
            ignoreDuplicates: true,
          }
        );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['chapter-progress', variables.chapterId],
      });
    },
  });
}
