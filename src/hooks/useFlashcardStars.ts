import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook for managing flashcard stars synced across devices via Supabase.
 * Falls back to localStorage for non-authenticated users.
 */
export function useFlashcardStars(chapterId?: string) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  
  // Optimistic local state for immediate UI feedback
  const [optimisticStars, setOptimisticStars] = useState<Set<string>>(new Set());

  // Fetch stars from Supabase
  const { data: serverStars, isLoading } = useQuery({
    queryKey: ['flashcard-stars', user?.id, chapterId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('user_flashcard_stars')
        .select('card_id')
        .eq('user_id', user.id);
      
      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data?.map(s => s.card_id) ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Sync server stars to optimistic state
  useEffect(() => {
    if (serverStars) {
      setOptimisticStars(new Set(serverStars));
    }
  }, [serverStars]);

  // Load from localStorage for non-authenticated users
  useEffect(() => {
    if (!user?.id && chapterId) {
      const stored = localStorage.getItem(`flashcard-stars-${chapterId}`);
      if (stored) {
        try {
          setOptimisticStars(new Set(JSON.parse(stored)));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [user?.id, chapterId]);

  // Add star mutation
  const addStarMutation = useMutation({
    mutationFn: async ({ cardId, chapterId: chapId }: { cardId: string; chapterId?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_flashcard_stars')
        .upsert({
          user_id: user.id,
          card_id: cardId,
          chapter_id: chapId || null,
        }, {
          onConflict: 'user_id,card_id',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-stars', user?.id] });
    },
  });

  // Remove star mutation
  const removeStarMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_flashcard_stars')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-stars', user?.id] });
    },
  });

  // Toggle star with optimistic update
  const toggleStar = useCallback((cardId: string, cardChapterId?: string) => {
    const isCurrentlyStarred = optimisticStars.has(cardId);
    
    // Optimistic update
    setOptimisticStars(prev => {
      const next = new Set(prev);
      if (isCurrentlyStarred) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });

    // Persist to server or localStorage
    if (user?.id) {
      if (isCurrentlyStarred) {
        removeStarMutation.mutate(cardId);
      } else {
        addStarMutation.mutate({ cardId, chapterId: cardChapterId || chapterId });
      }
    } else if (chapterId) {
      // Fallback to localStorage for non-authenticated users
      const newSet = new Set(optimisticStars);
      if (isCurrentlyStarred) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      localStorage.setItem(`flashcard-stars-${chapterId}`, JSON.stringify([...newSet]));
    }
  }, [optimisticStars, user?.id, chapterId, addStarMutation, removeStarMutation]);

  return {
    starredIds: optimisticStars,
    isLoading,
    toggleStar,
    isStarred: (cardId: string) => optimisticStars.has(cardId),
  };
}
