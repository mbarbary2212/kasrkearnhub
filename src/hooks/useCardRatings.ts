import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CardRatingType = 'easy' | 'hard' | 'revise';

interface CardRating {
  id: string;
  user_id: string;
  card_id: string;
  rating: CardRatingType;
  created_at: string;
  updated_at: string;
}

export function useCardRating(cardId: string | undefined) {
  return useQuery({
    queryKey: ['card-rating', cardId],
    enabled: !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_ratings' as any)
        .select('*')
        .eq('card_id', cardId!)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as CardRating) ?? null;
    },
  });
}

export function useRateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: CardRatingType }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('card_ratings' as any)
        .upsert(
          { user_id: user.id, card_id: cardId, rating, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,card_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CardRating;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['card-rating', data.card_id], data);
      queryClient.invalidateQueries({ queryKey: ['card-ratings-bulk'] });
    },
  });
}

export function useClearCardRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId }: { cardId: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('card_ratings' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardId);

      if (error) throw error;
      return cardId;
    },
    onSuccess: (cardId) => {
      queryClient.setQueryData(['card-rating', cardId], null);
      queryClient.invalidateQueries({ queryKey: ['card-ratings-bulk'] });
    },
  });
}

export function useCardRatingsBulk(cardIds: string[]) {
  return useQuery({
    queryKey: ['card-ratings-bulk', cardIds],
    enabled: cardIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_ratings' as any)
        .select('card_id, rating')
        .in('card_id', cardIds);

      if (error) throw error;

      const map = new Map<string, CardRatingType>();
      for (const row of (data as any[]) ?? []) {
        map.set(row.card_id, row.rating);
      }
      return map;
    },
  });
}
