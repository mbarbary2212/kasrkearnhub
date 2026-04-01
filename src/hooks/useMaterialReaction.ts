import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ReactionType = 'up' | 'down';

interface Reaction {
  id: string;
  reaction_type: ReactionType;
}

export function useMaterialReaction(materialType: string, materialId: string | undefined, chapterId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['material-reaction', materialType, materialId, user?.id];

  const { data: currentReaction } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Reaction | null> => {
      if (!user || !materialId) return null;
      const { data, error } = await supabase
        .from('material_reactions')
        .select('id, reaction_type')
        .eq('user_id', user.id)
        .eq('material_type', materialType)
        .eq('material_id', materialId)
        .maybeSingle();
      if (error) throw error;
      return data as Reaction | null;
    },
    enabled: !!user && !!materialId,
  });

  const react = useMutation({
    mutationFn: async (reactionType: ReactionType) => {
      if (!user || !materialId) throw new Error('Not authenticated');

      if (currentReaction?.reaction_type === reactionType) {
        // Toggle off
        const { error } = await supabase
          .from('material_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('material_type', materialType)
          .eq('material_id', materialId);
        if (error) throw error;
      } else {
        // Upsert
        const { error } = await supabase
          .from('material_reactions')
          .upsert(
            {
              user_id: user.id,
              material_type: materialType,
              material_id: materialId,
              chapter_id: chapterId || null,
              reaction_type: reactionType,
            },
            { onConflict: 'user_id,material_type,material_id' }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    currentReaction: currentReaction?.reaction_type ?? null,
    react: (type: ReactionType) => react.mutate(type),
    isLoading: react.isPending,
  };
}
