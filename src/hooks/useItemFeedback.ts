import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { MAX_SUBMISSIONS_PER_HOUR } from '@/lib/feedbackValidation';

export type ItemType = 'video' | 'resource' | 'mcq' | 'practical' | 'shortq' | 'case';
export type FeedbackCategory = 'content_quality' | 'technical_issue' | 'suggestion' | 'error' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'closed';
export type AssignedTeam = 'platform' | 'module' | 'chapter' | 'teacher';

export interface ItemFeedback {
  id: string;
  user_id: string;
  module_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
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
  // Assignment tracking
  assigned_to_user_id: string | null;
  assigned_team: AssignedTeam | null;
  seen_by_admin: boolean;
  first_viewed_at: string | null;
  first_viewed_by: string | null;
  // Revealed user profile (only for super admins who reveal)
  user_profile?: {
    full_name: string | null;
    email: string;
  } | null;
  is_identity_revealed?: boolean;
}

export function useSubmitItemFeedback() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      moduleId?: string | null;
      chapterId?: string;
      topicId?: string;
      itemType: ItemType;
      itemId?: string;
      rating?: number;
      category: FeedbackCategory;
      message: string;
      isAnonymous?: boolean;
    }) => {
      if (!user?.id) throw new Error('Must be logged in to submit feedback');

      // Rate limiting: Check recent submissions
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from('item_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo);

      if (countError) throw countError;
      
      if (count !== null && count >= MAX_SUBMISSIONS_PER_HOUR) {
        throw new Error(`Rate limit exceeded. Maximum ${MAX_SUBMISSIONS_PER_HOUR} submissions per hour.`);
      }

      const { data: insertedData, error } = await supabase.from('item_feedback').insert({
        user_id: user.id,
        module_id: data.moduleId ?? null,
        chapter_id: data.chapterId || null,
        topic_id: data.topicId || null,
        item_type: data.itemType,
        item_id: data.itemId || null,
        rating: data.rating || null,
        category: data.category,
        message: data.message,
        is_anonymous: data.isAnonymous ?? true,
      }).select('id').single();

      if (error) throw error;

      // Notify admins via Edge Function
      try {
        await supabase.functions.invoke('notify-ticket-admins', {
          body: {
            type: 'feedback',
            id: insertedData.id,
            module_id: data.moduleId ?? null,
            chapter_id: data.chapterId || null,
            topic_id: data.topicId || null,
            category: data.category,
          },
        });
      } catch (notifyError) {
        console.error('Failed to notify admins:', notifyError);
        // Don't throw - the feedback was still created
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-feedback'] });
    },
  });
}

export function useAssignFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      assignedToUserId?: string | null;
      assignedTeam?: AssignedTeam | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (data.assignedToUserId !== undefined) updates.assigned_to_user_id = data.assignedToUserId;
      if (data.assignedTeam !== undefined) updates.assigned_team = data.assignedTeam;

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

export function useMarkFeedbackSeen() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('item_feedback')
        .update({
          seen_by_admin: true,
          first_viewed_at: new Date().toISOString(),
          first_viewed_by: user.id,
        })
        .eq('id', feedbackId)
        .eq('seen_by_admin', false); // Only update if not already seen

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-feedback'] });
    },
  });
}

export function useMyFeedback() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['item-feedback', 'mine', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('item_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ItemFeedback[];
    },
    enabled: !!user?.id,
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
  moduleIds?: string[];
  chapterIds?: string[];
  topicIds?: string[];
  status?: FeedbackStatus;
  isFlagged?: boolean;
}, options?: { includeUserProfiles?: boolean }) {
  return useQuery({
    queryKey: ['item-feedback', 'all', filters, options?.includeUserProfiles],
    queryFn: async () => {
      let query = supabase
        .from('item_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.moduleId) {
        query = query.eq('module_id', filters.moduleId);
      }
      if (filters?.moduleIds && filters.moduleIds.length > 0) {
        query = query.in('module_id', filters.moduleIds);
      }
      if (filters?.chapterIds && filters.chapterIds.length > 0) {
        query = query.in('chapter_id', filters.chapterIds);
      }
      if (filters?.topicIds && filters.topicIds.length > 0) {
        query = query.in('topic_id', filters.topicIds);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.isFlagged !== undefined) {
        query = query.eq('is_flagged', filters.isFlagged);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If super admin wants user profiles, fetch them
      if (options?.includeUserProfiles) {
        const userIds = [...new Set((data || []).map(f => f.user_id).filter(Boolean))];
        let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          
          profilesMap = (profiles || []).reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email };
            return acc;
          }, {} as Record<string, { full_name: string | null; email: string }>);
        }

        return (data || []).map(feedback => ({
          ...feedback,
          user_profile: feedback.user_id ? profilesMap[feedback.user_id] || null : null,
        })) as ItemFeedback[];
      }

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
