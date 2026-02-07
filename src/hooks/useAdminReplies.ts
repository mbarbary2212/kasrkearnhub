import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type ThreadType = 'feedback' | 'inquiry';

export interface AdminReply {
  id: string;
  thread_type: ThreadType;
  thread_id: string;
  admin_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  admin_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

// Get replies for a specific thread (admin or student)
export function useThreadReplies(threadType: ThreadType, threadId: string | undefined) {
  return useQuery({
    queryKey: ['admin-replies', threadType, threadId],
    queryFn: async () => {
      if (!threadId) return [];

      const { data, error } = await supabase
        .from('admin_replies')
        .select('*')
        .eq('thread_type', threadType)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch admin profiles
      const adminIds = [...new Set((data || []).map(r => r.admin_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};

      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', adminIds);

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string }>);
      }

      return (data || []).map(reply => ({
        ...reply,
        thread_type: reply.thread_type as ThreadType,
        admin_profile: profilesMap[reply.admin_id] || null,
      })) as AdminReply[];
    },
    enabled: !!threadId,
  });
}

// Get all replies for multiple threads (for student's messages view)
export function useMyThreadReplies() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['admin-replies', 'mine', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all feedback IDs for this user
      const { data: feedbackIds } = await supabase
        .from('item_feedback')
        .select('id')
        .eq('user_id', user.id);

      // Get all inquiry IDs for this user
      const { data: inquiryIds } = await supabase
        .from('inquiries')
        .select('id')
        .eq('user_id', user.id);

      const feedbackIdList = (feedbackIds || []).map(f => f.id);
      const inquiryIdList = (inquiryIds || []).map(i => i.id);

      if (feedbackIdList.length === 0 && inquiryIdList.length === 0) {
        return [];
      }

      // Build query for replies to user's threads
      let query = supabase
        .from('admin_replies')
        .select('*')
        .order('created_at', { ascending: false });

      // We need to use OR logic for the two thread types
      const conditions: string[] = [];
      if (feedbackIdList.length > 0) {
        conditions.push(`and(thread_type.eq.feedback,thread_id.in.(${feedbackIdList.join(',')}))`);
      }
      if (inquiryIdList.length > 0) {
        conditions.push(`and(thread_type.eq.inquiry,thread_id.in.(${inquiryIdList.join(',')}))`);
      }

      if (conditions.length === 1) {
        // Single condition - parse and apply
        if (feedbackIdList.length > 0) {
          query = query.eq('thread_type', 'feedback').in('thread_id', feedbackIdList);
        } else {
          query = query.eq('thread_type', 'inquiry').in('thread_id', inquiryIdList);
        }
      } else {
        // Multiple conditions - use or
        query = query.or(`thread_type.eq.feedback,thread_type.eq.inquiry`);
        // Then filter in JS since complex OR with IN is tricky in PostgREST
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter to only replies for user's threads
      const allThreadIds = new Set([...feedbackIdList, ...inquiryIdList]);
      const filteredData = (data || []).filter(r => allThreadIds.has(r.thread_id));

      // Fetch admin profiles
      const adminIds = [...new Set(filteredData.map(r => r.admin_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};

      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', adminIds);

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string }>);
      }

      return filteredData.map(reply => ({
        ...reply,
        thread_type: reply.thread_type as ThreadType,
        admin_profile: profilesMap[reply.admin_id] || null,
      })) as AdminReply[];
    },
    enabled: !!user?.id,
  });
}

// Count unread replies for student badge
export function useUnreadReplyCount() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['admin-replies', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Get all feedback IDs for this user
      const { data: feedbackIds } = await supabase
        .from('item_feedback')
        .select('id')
        .eq('user_id', user.id);

      // Get all inquiry IDs for this user
      const { data: inquiryIds } = await supabase
        .from('inquiries')
        .select('id')
        .eq('user_id', user.id);

      const feedbackIdList = (feedbackIds || []).map(f => f.id);
      const inquiryIdList = (inquiryIds || []).map(i => i.id);

      if (feedbackIdList.length === 0 && inquiryIdList.length === 0) {
        return 0;
      }

      // Get all unread replies
      const { data, error } = await supabase
        .from('admin_replies')
        .select('id, thread_type, thread_id')
        .eq('is_read', false);

      if (error) throw error;

      // Filter to only replies for user's threads
      const allThreadIds = new Set([...feedbackIdList, ...inquiryIdList]);
      const unreadCount = (data || []).filter(r => allThreadIds.has(r.thread_id)).length;

      return unreadCount;
    },
    enabled: !!user?.id,
  });
}

// Admin: Submit a reply to a thread
export function useSubmitReply() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      threadType: ThreadType;
      threadId: string;
      message: string;
    }) => {
      if (!user?.id) throw new Error('Must be logged in to submit reply');

      const { error } = await supabase.from('admin_replies').insert({
        thread_type: data.threadType,
        thread_id: data.threadId,
        admin_id: user.id,
        message: data.message,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-replies', variables.threadType, variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['admin-replies', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['admin-replies', 'unread-count'] });
    },
  });
}

// Student: Mark a reply as read
export function useMarkReplyRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase
        .from('admin_replies')
        .update({ is_read: true })
        .eq('id', replyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-replies'] });
    },
  });
}

// Mark all replies for a thread as read
export function useMarkThreadRepliesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { threadType: ThreadType; threadId: string }) => {
      const { error } = await supabase
        .from('admin_replies')
        .update({ is_read: true })
        .eq('thread_type', data.threadType)
        .eq('thread_id', data.threadId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-replies'] });
    },
  });
}
