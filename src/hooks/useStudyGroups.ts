import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_by: string;
  module_id: string | null;
  privacy_type: 'invite_only' | 'request_to_join';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  my_role?: 'owner' | 'admin' | 'member' | null;
  my_status?: 'pending' | 'active' | 'declined' | null;
}

export interface StudyGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'declined';
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface StudyGroupInvite {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
  group?: StudyGroup;
  inviter_profile?: {
    full_name: string | null;
  };
}

export interface StudyGroupThread {
  id: string;
  group_id: string;
  title: string;
  created_by: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface StudyGroupMessage {
  id: string;
  thread_id: string;
  user_id: string | null;
  parent_id: string | null;
  content: string;
  is_edited: boolean;
  moderation_status: string;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: StudyGroupMessage[];
}

// Fetch user's study groups
export function useMyStudyGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['study-groups', 'my-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get groups where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('study_group_members')
        .select('group_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) return [];

      const groupIds = memberships.map(m => m.group_id);

      // Fetch groups
      const { data: groups, error: groupsError } = await supabase
        .from('study_groups')
        .select('*')
        .in('id', groupIds)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Get member counts
      const { data: counts, error: countError } = await supabase
        .from('study_group_members')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('status', 'active');

      if (countError) throw countError;

      const countMap = counts?.reduce((acc, m) => {
        acc[m.group_id] = (acc[m.group_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const roleMap = memberships.reduce((acc, m) => {
        acc[m.group_id] = { role: m.role, status: m.status };
        return acc;
      }, {} as Record<string, { role: string; status: string }>);

      return (groups || []).map(g => ({
        ...g,
        privacy_type: g.privacy_type as 'invite_only' | 'request_to_join',
        member_count: countMap[g.id] || 0,
        my_role: roleMap[g.id]?.role as 'owner' | 'admin' | 'member' | null,
        my_status: roleMap[g.id]?.status as 'pending' | 'active' | 'declined' | null,
      })) as StudyGroup[];
    },
    enabled: !!user,
  });
}

// Fetch discoverable groups (request_to_join that user is not in)
export function useDiscoverableGroups(moduleId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['study-groups', 'discoverable', moduleId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's current memberships
      const { data: memberships } = await supabase
        .from('study_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const excludeIds = memberships?.map(m => m.group_id) || [];

      let query = supabase
        .from('study_groups')
        .select('*')
        .eq('privacy_type', 'request_to_join')
        .eq('is_active', true);

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      if (data && data.length > 0) {
        const groupIds = data.map(g => g.id);
        const { data: counts } = await supabase
          .from('study_group_members')
          .select('group_id')
          .in('group_id', groupIds)
          .eq('status', 'active');

        const countMap = counts?.reduce((acc, m) => {
          acc[m.group_id] = (acc[m.group_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        return data.map(g => ({
          ...g,
          privacy_type: g.privacy_type as 'invite_only' | 'request_to_join',
          member_count: countMap[g.id] || 0,
        })) as StudyGroup[];
      }

      return [] as StudyGroup[];
    },
    enabled: !!user,
  });
}

// Fetch single group details
export function useStudyGroupDetail(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['study-groups', 'detail', groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data: group, error } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;

      // Get member count
      const { data: members } = await supabase
        .from('study_group_members')
        .select('group_id, role, status, user_id')
        .eq('group_id', groupId)
        .eq('status', 'active');

      const myMembership = members?.find(m => m.user_id === user?.id);

      return {
        ...group,
        privacy_type: group.privacy_type as 'invite_only' | 'request_to_join',
        member_count: members?.length || 0,
        my_role: myMembership?.role as 'owner' | 'admin' | 'member' | null,
        my_status: myMembership?.status as 'pending' | 'active' | 'declined' | null,
      } as StudyGroup;
    },
    enabled: !!groupId && !!user,
  });
}

// Fetch group members
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['study-groups', 'members', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data: members, error } = await supabase
        .from('study_group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = members?.map(m => m.user_id).filter(Boolean) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>) || {};

      return (members || []).map(m => ({
        ...m,
        role: m.role as 'owner' | 'admin' | 'member',
        status: m.status as 'pending' | 'active' | 'declined',
        profile: profileMap[m.user_id] || null,
      })) as StudyGroupMember[];
    },
    enabled: !!groupId,
  });
}

// Fetch pending join requests for a group
export function usePendingJoinRequests(groupId: string | undefined) {
  return useQuery({
    queryKey: ['study-groups', 'pending-requests', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data: members, error } = await supabase
        .from('study_group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = members?.map(m => m.user_id).filter(Boolean) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>) || {};

      return (members || []).map(m => ({
        ...m,
        role: m.role as 'owner' | 'admin' | 'member',
        status: m.status as 'pending' | 'active' | 'declined',
        profile: profileMap[m.user_id] || null,
      })) as StudyGroupMember[];
    },
    enabled: !!groupId,
  });
}

// Fetch user's pending invites
export function useMyInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['study-groups', 'my-invites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: invites, error } = await supabase
        .from('study_group_invites')
        .select('*')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!invites || invites.length === 0) return [];

      // Fetch group details
      const groupIds = invites.map(i => i.group_id);
      const { data: groups } = await supabase
        .from('study_groups')
        .select('*')
        .in('id', groupIds);

      // Fetch inviter profiles
      const inviterIds = invites.map(i => i.invited_by).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', inviterIds);

      const groupMap = groups?.reduce((acc, g) => {
        acc[g.id] = g;
        return acc;
      }, {} as Record<string, any>) || {};

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>) || {};

      return invites.map(i => ({
        ...i,
        status: i.status as 'pending' | 'accepted' | 'declined',
        group: groupMap[i.group_id] ? {
          ...groupMap[i.group_id],
          privacy_type: groupMap[i.group_id].privacy_type as 'invite_only' | 'request_to_join',
        } : undefined,
        inviter_profile: profileMap[i.invited_by] || undefined,
      })) as StudyGroupInvite[];
    },
    enabled: !!user,
  });
}

// Create a new study group
export function useCreateStudyGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      privacy_type,
      module_id,
    }: {
      name: string;
      description?: string;
      privacy_type: 'invite_only' | 'request_to_join';
      module_id?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name,
          description: description || null,
          privacy_type,
          module_id: module_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Study group created successfully!');
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast.error('Failed to create study group');
    },
  });
}

// Request to join a group
export function useRequestToJoin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member',
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Join request sent!');
    },
    onError: (error) => {
      console.error('Error requesting to join:', error);
      toast.error('Failed to send join request');
    },
  });
}

// Approve join request
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase
        .from('study_group_members')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Member approved!');
    },
    onError: (error) => {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    },
  });
}

// Decline join request
export function useDeclineJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase
        .from('study_group_members')
        .update({ status: 'declined' })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Request declined');
    },
    onError: (error) => {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    },
  });
}

// Send invite
export function useSendInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      message,
    }: {
      groupId: string;
      userId: string;
      message?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('study_group_invites')
        .insert({
          group_id: groupId,
          invited_user_id: userId,
          invited_by: user.id,
          message: message || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Invite sent!');
    },
    onError: (error: any) => {
      console.error('Error sending invite:', error);
      if (error.code === '23505') {
        toast.error('User has already been invited');
      } else {
        toast.error('Failed to send invite');
      }
    },
  });
}

// Accept invite
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Get invite details
      const { data: invite, error: fetchError } = await supabase
        .from('study_group_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (fetchError) throw fetchError;

      // Update invite status
      const { error: updateError } = await supabase
        .from('study_group_invites')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      // Add as member
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: invite.group_id,
          user_id: user.id,
          role: 'member',
          status: 'active',
          invited_by: invite.invited_by,
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('You have joined the group!');
    },
    onError: (error) => {
      console.error('Error accepting invite:', error);
      toast.error('Failed to accept invite');
    },
  });
}

// Decline invite
export function useDeclineInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('study_group_invites')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Invite declined');
    },
    onError: (error) => {
      console.error('Error declining invite:', error);
      toast.error('Failed to decline invite');
    },
  });
}

// Leave group
export function useLeaveGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('study_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('You have left the group');
    },
    onError: (error) => {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    },
  });
}

// Remove member
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase
        .from('study_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Member removed');
    },
    onError: (error) => {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    },
  });
}

// Promote to admin
export function usePromoteToAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase
        .from('study_group_members')
        .update({ role: 'admin' })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Member promoted to admin');
    },
    onError: (error) => {
      console.error('Error promoting member:', error);
      toast.error('Failed to promote member');
    },
  });
}

// Demote from admin
export function useDemoteFromAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase
        .from('study_group_members')
        .update({ role: 'member' })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success('Member demoted from admin');
    },
    onError: (error) => {
      console.error('Error demoting member:', error);
      toast.error('Failed to demote member');
    },
  });
}

// Search users to invite
export function useSearchUsersToInvite(searchTerm: string, groupId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'search-invite', searchTerm, groupId],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2 || !groupId) return [];

      const { data, error } = await supabase.rpc('search_invitable_users', {
        search_term: searchTerm,
        group_id: groupId,
      });

      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }>;
    },
    enabled: searchTerm.length >= 2 && !!groupId,
    retry: false,
  });
}

// Group threads hooks
export function useGroupThreads(groupId: string | undefined) {
  return useQuery({
    queryKey: ['study-groups', 'threads', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data: threads, error } = await supabase
        .from('study_group_threads')
        .select('*')
        .eq('group_id', groupId)
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      // Fetch author profiles
      const authorIds = threads?.map(t => t.created_by).filter(Boolean) as string[];
      if (authorIds.length === 0) return threads as StudyGroupThread[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>) || {};

      return (threads || []).map(t => ({
        ...t,
        author: t.created_by ? profileMap[t.created_by] : undefined,
      })) as StudyGroupThread[];
    },
    enabled: !!groupId,
  });
}

export function useCreateGroupThread() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      title,
      content,
    }: {
      groupId: string;
      title: string;
      content: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('study_group_threads')
        .insert({
          group_id: groupId,
          title,
          created_by: user.id,
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Create first message
      const { error: msgError } = await supabase
        .from('study_group_messages')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content,
        });

      if (msgError) throw msgError;

      return thread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups', 'threads'] });
      toast.success('Thread created!');
    },
    onError: (error) => {
      console.error('Error creating thread:', error);
      toast.error('Failed to create thread');
    },
  });
}

export function useGroupMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: ['study-groups', 'messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];

      const { data: messages, error } = await supabase
        .from('study_group_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      const authorIds = messages?.map(m => m.user_id).filter(Boolean) as string[];
      if (authorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>) || {};

      // Build threaded structure
      const messagesWithAuthors = (messages || []).map(m => ({
        ...m,
        author: m.user_id ? profileMap[m.user_id] : undefined,
      }));

      const rootMessages: StudyGroupMessage[] = [];
      const replyMap: Record<string, StudyGroupMessage[]> = {};

      messagesWithAuthors.forEach(m => {
        if (m.parent_id) {
          if (!replyMap[m.parent_id]) replyMap[m.parent_id] = [];
          replyMap[m.parent_id].push(m as StudyGroupMessage);
        } else {
          rootMessages.push(m as StudyGroupMessage);
        }
      });

      rootMessages.forEach(m => {
        m.replies = replyMap[m.id] || [];
      });

      return rootMessages;
    },
    enabled: !!threadId,
  });
}

export function usePostGroupMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      threadId,
      content,
      parentId,
    }: {
      threadId: string;
      content: string;
      parentId?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('study_group_messages')
        .insert({
          thread_id: threadId,
          user_id: user.id,
          content,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) {
        // Log the FULL Supabase error response so we can see code/details/hint
        console.error('[usePostGroupMessage] Supabase insert failed:', {
          message: error.message,
          code: (error as { code?: string }).code,
          details: (error as { details?: string }).details,
          hint: (error as { hint?: string }).hint,
          full: error,
        });
        throw error;
      }
      return { ...data, threadId };
    },
    onSuccess: (data) => {
      // Invalidate the specific thread's messages and the threads list
      queryClient.invalidateQueries({ queryKey: ['study-groups', 'messages', data.threadId] });
      queryClient.invalidateQueries({ queryKey: ['study-groups', 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['study-groups', 'threads'] });
    },
    onError: (error: unknown) => {
      const err = error as { message?: string; details?: string; hint?: string; code?: string } | undefined;
      const verbatim = [err?.message, err?.details, err?.hint, err?.code]
        .filter(Boolean)
        .join(' • ');
      toast.error(verbatim || 'Failed to post message');
    },
  });
}
