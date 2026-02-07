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

export interface Inquiry {
  id: string;
  user_id: string;
  module_id: string | null;
  chapter_id: string | null;
  category: InquiryCategory;
  subject: string;
  message: string;
  is_anonymous: boolean;
  status: InquiryStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
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
      isAnonymous?: boolean;
    }) => {
      if (!user?.id) throw new Error('Must be logged in to submit inquiry');

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

      const { error } = await supabase.from('inquiries').insert({
        user_id: user.id,
        module_id: data.moduleId || null,
        chapter_id: data.chapterId || null,
        category: data.category,
        subject: data.subject,
        message: data.message,
        is_anonymous: data.isAnonymous ?? false,
      });

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

      return (data || []).map(inquiry => ({
        ...inquiry,
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
