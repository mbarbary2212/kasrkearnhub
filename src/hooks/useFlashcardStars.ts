import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook for managing flashcard stars synced across devices via Supabase.
 * Falls back to localStorage for non-authenticated users.
 * 
 * IMPORTANT: chapterId and topicId are mutually exclusive - never pass both.
 * This hook correctly stores stars with the appropriate chapter_id or topic_id column.
 */
export function useFlashcardStars(params: { chapterId?: string; topicId?: string } | string = {}) {
  // Handle legacy string parameter (chapterId only)
  const { chapterId, topicId } = typeof params === 'string' 
    ? { chapterId: params, topicId: undefined }
    : params;
  
  const containerId = chapterId || topicId;
  const containerType = chapterId ? 'chapter' : 'topic';
  const containerColumn = chapterId ? 'chapter_id' : 'topic_id';
  
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Optimistic local state for immediate UI feedback
  const [optimisticStars, setOptimisticStars] = useState<Set<string>>(new Set());

  // Fetch stars from Supabase
  const { data: serverStars, isLoading } = useQuery({
    queryKey: ['flashcard-stars', user?.id, containerType, containerId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('user_flashcard_stars')
        .select('card_id')
        .eq('user_id', user.id);
      
      if (containerId) {
        query = query.eq(containerColumn, containerId);
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
    if (!user?.id && containerId) {
      const stored = localStorage.getItem(`flashcard-stars-${containerType}-${containerId}`);
      if (stored) {
        try {
          setOptimisticStars(new Set(JSON.parse(stored)));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [user?.id, containerId, containerType]);

  // Add star mutation - supports both chapter_id and topic_id
  const addStarMutation = useMutation({
    mutationFn: async ({ cardId, chapterId: chapId, topicId: topId }: { cardId: string; chapterId?: string; topicId?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        card_id: cardId,
      };
      
      // Set the correct column based on which ID is provided
      if (chapId) {
        insertData.chapter_id = chapId;
      } else if (topId) {
        insertData.topic_id = topId;
      }
      
      const { error } = await supabase
        .from('user_flashcard_stars')
        .upsert(insertData as never, {
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
  const toggleStar = useCallback((cardId: string, cardChapterId?: string, cardTopicId?: string) => {
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
        // Use the card's chapter/topic ID if provided, otherwise fall back to current context
        addStarMutation.mutate({ 
          cardId, 
          chapterId: cardChapterId || chapterId, 
          topicId: cardTopicId || topicId,
        });
      }
    } else if (containerId) {
      // Fallback to localStorage for non-authenticated users
      const newSet = new Set(optimisticStars);
      if (isCurrentlyStarred) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      localStorage.setItem(`flashcard-stars-${containerType}-${containerId}`, JSON.stringify([...newSet]));
    }
  }, [optimisticStars, user?.id, chapterId, topicId, containerId, containerType, addStarMutation, removeStarMutation]);

  return {
    starredIds: optimisticStars,
    isLoading,
    toggleStar,
    isStarred: (cardId: string) => optimisticStars.has(cardId),
  };
}
