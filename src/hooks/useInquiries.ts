import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type InquiryCategory = 'general' | 'technical' | 'content' | 'account' | 'suggestion' | 'other';
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
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Inquiry[];
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
