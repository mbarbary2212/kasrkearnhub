import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { MAX_SUBMISSIONS_PER_HOUR } from '@/lib/feedbackValidation';

export type InquiryCategory = 
  | 'study_material' 
  | 'mcq_explanation' 
  | 'exam_assessment' 
  | 'syllabus_objectives' 
  | 'technical' 
  | 'suggestion' 
  | 'other'
  // Legacy values for backward compatibility
  | 'general' 
  | 'content' 
  | 'account';
export type InquiryStatus = 'open' | 'in_review' | 'resolved' | 'closed';
export type AssignedTeam = 'platform' | 'module' | 'chapter' | 'teacher';

export interface Inquiry {
  id: string;
  user_id: string;
  module_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  category: InquiryCategory;
  subject: string;
  message: string;
  is_anonymous: boolean;
  status: InquiryStatus;
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
  // Computed
  reply_count: number;
  // Joined profile data
  user_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

export function useSubmitInquiry() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category: InquiryCategory;
      subject: string;
      message: string;
      moduleId?: string;
      chapterId?: string;
      topicId?: string;
      isAnonymous?: boolean;
      assignedToUserId?: string;
      assignedTeam?: AssignedTeam;
    }) => {
      if (!user?.id) throw new Error('Must be logged in to submit inquiry');

      // Validate assignedToUserId is a valid UUID if provided
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (data.assignedToUserId && !UUID_RE.test(data.assignedToUserId)) {
        console.error('[useSubmitInquiry] Invalid assignedToUserId:', data.assignedToUserId);
        throw new Error('Invalid doctor selection — please re-select');
      }

      // Verify the assigned admin actually exists in profiles (FK is to auth.users,
      // but profiles.id mirrors auth.users.id). This gives a clear error before
      // hitting a confusing FK violation.
      if (data.assignedToUserId) {
        const { data: adminProfile, error: adminLookupError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', data.assignedToUserId)
          .maybeSingle();
        if (adminLookupError) {
          console.error('[useSubmitInquiry] Admin lookup failed:', adminLookupError);
        }
        if (!adminProfile) {
          throw new Error('Selected doctor not found — please re-select');
        }
        console.log('[useSubmitInquiry] Resolved assigned admin:', adminProfile);
      }

      // Rate limiting: Check recent submissions
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo);

      if (countError) throw countError;
      
      if (count !== null && count >= MAX_SUBMISSIONS_PER_HOUR) {
        throw new Error(`Rate limit exceeded. Maximum ${MAX_SUBMISSIONS_PER_HOUR} questions per hour.`);
      }

      const { data: insertedData, error } = await supabase.from('inquiries').insert({
        user_id: user.id,
        module_id: data.moduleId || null,
        chapter_id: data.chapterId || null,
        topic_id: data.topicId || null,
        category: data.category,
        subject: data.subject,
        message: data.message,
        is_anonymous: data.isAnonymous ?? false,
        assigned_to_user_id: data.assignedToUserId || null,
        assigned_team: data.assignedTeam || null,
      }).select('id').single();

      if (error) throw error;

      // Notify admins via Edge Function
      try {
        await supabase.functions.invoke('notify-ticket-admins', {
          body: {
            type: 'inquiry',
            id: insertedData.id,
            module_id: data.moduleId || null,
            chapter_id: data.chapterId || null,
            topic_id: data.topicId || null,
            category: data.category,
            subject: data.subject,
          },
        });
      } catch (notifyError) {
        console.error('Failed to notify admins:', notifyError);
        // Don't throw - the inquiry was still created
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}

export function useAssignInquiry() {
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
        .from('inquiries')
        .update(updates)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}

export function useMarkInquirySeen() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inquiryId: string) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('inquiries')
        .update({
          seen_by_admin: true,
          first_viewed_at: new Date().toISOString(),
          first_viewed_by: user.id,
        })
        .eq('id', inquiryId)
        .eq('seen_by_admin', false); // Only update if not already seen

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}

export function useMyInquiries() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['inquiries', 'mine', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Inquiry[];
    },
    enabled: !!user?.id,
  });
}

export function useAllInquiries(filters?: {
  moduleId?: string;
  moduleIds?: string[];
  chapterIds?: string[];
  topicIds?: string[];
  status?: InquiryStatus;
}) {
  return useQuery({
    queryKey: ['inquiries', 'all', filters],
    queryFn: async () => {
      let query = supabase
        .from('inquiries')
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

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for all inquiries
      const userIds = [...new Set((data || []).map(i => i.user_id).filter(Boolean))];
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

      // Fetch reply counts from admin_replies
      const inquiryIds = (data || []).map(i => i.id);
      let replyCountMap: Record<string, number> = {};

      if (inquiryIds.length > 0) {
        const { data: replies } = await supabase
          .from('admin_replies')
          .select('thread_id')
          .eq('thread_type', 'inquiry')
          .in('thread_id', inquiryIds);

        replyCountMap = (replies || []).reduce((acc, r) => {
          acc[r.thread_id] = (acc[r.thread_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      return (data || []).map(inquiry => ({
        ...inquiry,
        reply_count: replyCountMap[inquiry.id] || 0,
        user_profile: inquiry.user_id ? profilesMap[inquiry.user_id] || null : null,
      })) as Inquiry[];
    },
  });
}

export function useUpdateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status?: InquiryStatus;
      admin_notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (data.status) updates.status = data.status;
      if (data.admin_notes !== undefined) updates.admin_notes = data.admin_notes;

      const { error } = await supabase
        .from('inquiries')
        .update(updates)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}
