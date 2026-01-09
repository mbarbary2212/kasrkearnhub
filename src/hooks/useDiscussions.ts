import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkMessage } from "@/lib/profanityFilter";

export interface DiscussionThread {
  id: string;
  module_id: string | null;
  chapter_id: string | null;
  title: string;
  created_by: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null };
}

export interface DiscussionMessage {
  id: string;
  thread_id: string;
  parent_id: string | null;
  user_id: string | null;
  content: string;
  moderation_status: string;
  moderation_reason: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author?: { full_name: string | null; avatar_url: string | null };
  replies?: DiscussionMessage[];
}

export interface DiscussionReport {
  id: string;
  message_id: string;
  reported_by: string | null;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

// Fetch threads for a module
export function useModuleThreads(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['discussion-threads', 'module', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data: threads, error } = await supabase
        .from('discussion_threads')
        .select('*')
        .eq('module_id', moduleId)
        .is('chapter_id', null)
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch author profiles separately
      const userIds = threads.map(t => t.created_by).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return threads.map(t => ({
        ...t,
        author: t.created_by ? profileMap.get(t.created_by) : undefined,
      })) as DiscussionThread[];
    },
    enabled: !!moduleId,
  });
}

// Fetch threads for a chapter
export function useChapterThreads(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['discussion-threads', 'chapter', chapterId],
    queryFn: async () => {
      if (!chapterId) return [];
      
      const { data: threads, error } = await supabase
        .from('discussion_threads')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch author profiles separately
      const userIds = threads.map(t => t.created_by).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return threads.map(t => ({
        ...t,
        author: t.created_by ? profileMap.get(t.created_by) : undefined,
      })) as DiscussionThread[];
    },
    enabled: !!chapterId,
  });
}

// Fetch messages for a thread
export function useThreadMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: ['discussion-messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      const { data: messagesData, error } = await supabase
        .from('discussion_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch author profiles separately
      const userIds = messagesData.map(m => m.user_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Map messages with authors
      const messages: DiscussionMessage[] = messagesData.map(m => ({
        ...m,
        author: m.user_id ? profileMap.get(m.user_id) : undefined,
        replies: [],
      }));
      
      // Organize into threaded structure
      const rootMessages: DiscussionMessage[] = [];
      const messageMap = new Map<string, DiscussionMessage>();
      
      messages.forEach(msg => {
        messageMap.set(msg.id, msg);
      });
      
      messages.forEach(msg => {
        if (msg.parent_id) {
          const parent = messageMap.get(msg.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(msg);
          } else {
            rootMessages.push(msg);
          }
        } else {
          rootMessages.push(msg);
        }
      });
      
      return rootMessages;
    },
    enabled: !!threadId,
  });
}

// Create a new thread
export function useCreateThread() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      chapterId, 
      title, 
      content 
    }: { 
      moduleId?: string; 
      chapterId?: string; 
      title: string; 
      content: string;
    }) => {
      // Client-side profanity check
      const titleCheck = checkMessage(title);
      const contentCheck = checkMessage(content);
      
      if (titleCheck.blocked || contentCheck.blocked) {
        const allMatches = [...titleCheck.matches, ...contentCheck.matches];
        throw new Error(`Your message contains inappropriate content. Please revise and try again.`);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a thread');
      
      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('discussion_threads')
        .insert({
          module_id: moduleId || null,
          chapter_id: chapterId || null,
          title,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (threadError) throw threadError;
      
      // Create first message
      const { data: message, error: messageError } = await supabase
        .from('discussion_messages')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content,
        })
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // Async moderation (don't wait)
      supabase.functions.invoke('moderate-message', {
        body: { messageId: message.id, content }
      }).catch(console.error);
      
      return thread;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] });
      toast.success('Thread created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Post a message
export function usePostMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      threadId, 
      content, 
      parentId 
    }: { 
      threadId: string; 
      content: string; 
      parentId?: string;
    }) => {
      // Client-side profanity check
      const check = checkMessage(content);
      if (check.blocked) {
        throw new Error(`Your message contains inappropriate content. Please revise and try again.`);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to post');
      
      // Check if thread is locked
      const { data: thread } = await supabase
        .from('discussion_threads')
        .select('is_locked')
        .eq('id', threadId)
        .single();
      
      if (thread?.is_locked) {
        throw new Error('This thread is locked and no longer accepting replies');
      }
      
      const { data: message, error } = await supabase
        .from('discussion_messages')
        .insert({
          thread_id: threadId,
          parent_id: parentId || null,
          user_id: user.id,
          content,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Async moderation
      supabase.functions.invoke('moderate-message', {
        body: { messageId: message.id, content }
      }).catch(console.error);
      
      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-messages', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Edit a message
export function useEditMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const check = checkMessage(content);
      if (check.blocked) {
        throw new Error(`Your message contains inappropriate content. Please revise and try again.`);
      }
      
      const { data, error } = await supabase
        .from('discussion_messages')
        .update({ content, is_edited: true })
        .eq('id', messageId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Re-moderate
      supabase.functions.invoke('moderate-message', {
        body: { messageId, content }
      }).catch(console.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-messages'] });
      toast.success('Message updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete a message
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('discussion_messages')
        .update({ moderation_status: 'removed', moderation_reason: 'Deleted by user' })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-messages'] });
      toast.success('Message deleted');
    },
  });
}

// Report a message
export function useReportMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to report');
      
      const { data, error } = await supabase
        .from('discussion_reports')
        .insert({
          message_id: messageId,
          reported_by: user.id,
          reason,
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already reported this message');
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Report submitted. Thank you for helping keep discussions safe.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Get pending reports
export function usePendingReports() {
  return useQuery({
    queryKey: ['discussion-reports', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_reports')
        .select(`
          *,
          message:discussion_messages(
            id, content, user_id, thread_id, moderation_status,
            author:profiles!discussion_messages_user_id_fkey(full_name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// Admin: Get flagged messages
export function useFlaggedMessages() {
  return useQuery({
    queryKey: ['discussion-messages', 'flagged'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_messages')
        .select(`
          *,
          author:profiles!discussion_messages_user_id_fkey(full_name, avatar_url),
          thread:discussion_threads(id, title, module_id, chapter_id)
        `)
        .eq('moderation_status', 'flagged')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// Admin: Approve message
export function useApproveMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('discussion_messages')
        .update({ moderation_status: 'approved', moderation_reason: null })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-messages'] });
      toast.success('Message approved');
    },
  });
}

// Admin: Remove message
export function useRemoveMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason: string }) => {
      const { error } = await supabase
        .from('discussion_messages')
        .update({ moderation_status: 'removed', moderation_reason: reason })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-messages'] });
      toast.success('Message removed');
    },
  });
}

// Admin: Issue warning
export function useIssueWarning() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      messageId, 
      reason 
    }: { 
      userId: string; 
      messageId?: string; 
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('discussion_warnings')
        .insert({
          user_id: userId,
          message_id: messageId || null,
          reason,
          issued_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Check warning count for auto-ban
      const { data: countData } = await supabase
        .rpc('get_user_warning_count', { _user_id: userId });
      
      const warningCount = countData || 0;
      
      if (warningCount >= 3) {
        // Auto-ban for 7 days
        await supabase.rpc('admin_ban_user', {
          _target_user_id: userId,
          _reason: `Automatic ban: ${warningCount} discussion warnings`,
          _banned_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        toast.warning(`User has been automatically banned (${warningCount} warnings)`);
      } else if (warningCount === 2) {
        // 24-hour discussion restriction (handled by app logic)
        toast.info(`User has ${warningCount} warnings`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-warnings'] });
      toast.success('Warning issued');
    },
  });
}

// Admin: Review report
export function useReviewReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      adminNotes 
    }: { 
      reportId: string; 
      status: 'reviewed' | 'dismissed'; 
      adminNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('discussion_reports')
        .update({ 
          status, 
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-reports'] });
      toast.success('Report reviewed');
    },
  });
}

// Admin: Lock/unlock thread
export function useToggleThreadLock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, isLocked }: { threadId: string; isLocked: boolean }) => {
      const { error } = await supabase
        .from('discussion_threads')
        .update({ is_locked: isLocked })
        .eq('id', threadId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] });
      toast.success(variables.isLocked ? 'Thread locked' : 'Thread unlocked');
    },
  });
}

// Admin: Pin/unpin thread
export function useToggleThreadPin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, isPinned }: { threadId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('discussion_threads')
        .update({ is_pinned: isPinned })
        .eq('id', threadId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] });
      toast.success(variables.isPinned ? 'Thread pinned' : 'Thread unpinned');
    },
  });
}
