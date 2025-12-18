import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type ItemType = 'video' | 'resource' | 'mcq' | 'practical' | 'shortq' | 'case';
export type FeedbackCategory = 'content_quality' | 'technical_issue' | 'suggestion' | 'error' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface ItemFeedback {
  id: string;
  user_id: string;
  module_id: string | null;
  chapter_id: string | null;
  item_type: ItemType;
  item_id: string | null;
  rating: number | null;
  category: FeedbackCategory;
  message: string;
  is_anonymous: boolean;
  is_flagged: boolean;
  status: FeedbackStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function useSubmitItemFeedback() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      moduleId: string;
      chapterId?: string;
      itemType: ItemType;
      itemId?: string;
      rating?: number;
      category: FeedbackCategory;
      message: string;
      isAnonymous?: boolean;
    }) => {
      if (!user?.id) throw new Error('Must be logged in to submit feedback');

      const { error } = await supabase.from('item_feedback').insert({
        user_id: user.id,
        module_id: data.moduleId,
        chapter_id: data.chapterId || null,
        item_type: data.itemType,
        item_id: data.itemId || null,
        rating: data.rating || null,
        category: data.category,
        message: data.message,
        is_anonymous: data.isAnonymous ?? true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-feedback'] });
    },
  });
}

export function useModuleFeedback(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['item-feedback', 'module', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const { data, error } = await supabase
        .from('item_feedback')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ItemFeedback[];
    },
    enabled: !!moduleId,
  });
}

export function useAllFeedback(filters?: {
  moduleId?: string;
  status?: FeedbackStatus;
  isFlagged?: boolean;
}) {
  return useQuery({
    queryKey: ['item-feedback', 'all', filters],
    queryFn: async () => {
      let query = supabase
        .from('item_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.moduleId) {
        query = query.eq('module_id', filters.moduleId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.isFlagged !== undefined) {
        query = query.eq('is_flagged', filters.isFlagged);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ItemFeedback[];
    },
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status?: FeedbackStatus;
      is_flagged?: boolean;
      admin_notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (data.status) updates.status = data.status;
      if (data.is_flagged !== undefined) updates.is_flagged = data.is_flagged;
      if (data.admin_notes !== undefined) updates.admin_notes = data.admin_notes;

      const { error } = await supabase
        .from('item_feedback')
        .update(updates)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-feedback'] });
    },
  });
}
