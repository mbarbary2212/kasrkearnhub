import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useStudentAnnouncements } from '@/hooks/useAnnouncements';
import { useMyThreadReplies } from '@/hooks/useAdminReplies';
import { useMyInvites, useMyStudyGroups } from '@/hooks/useStudyGroups';

const DISCUSSIONS_LAST_SEEN_KEY = 'kalmhub:discussions-last-seen';

export function getDiscussionsLastSeen(): number {
  try {
    const v = localStorage.getItem(DISCUSSIONS_LAST_SEEN_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

export function markDiscussionsSeen() {
  try {
    localStorage.setItem(DISCUSSIONS_LAST_SEEN_KEY, String(Date.now()));
    // Notify same-tab listeners
    window.dispatchEvent(new Event('kalm:discussions-seen'));
  } catch {}
}

function useDiscussionsLastSeen() {
  const [lastSeen, setLastSeen] = useState<number>(() => getDiscussionsLastSeen());
  useEffect(() => {
    const handler = () => setLastSeen(getDiscussionsLastSeen());
    window.addEventListener('storage', handler);
    window.addEventListener('kalm:discussions-seen', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('kalm:discussions-seen', handler);
    };
  }, []);
  return lastSeen;
}

export interface ConnectBadgeCounts {
  messages: number;       // unread announcements + admin replies
  inquiry: number;        // unread admin replies on user's inquiries
  feedback: number;       // unread admin replies on user's feedback
  discussions: number;    // open discussion threads with activity since last visit
  studyGroups: number;    // pending invites + pending join requests on groups I admin
  total: number;          // sum, used for the parent "Connect" badge
}

/**
 * Single source of truth for all Connect-related notification badges.
 * Returns per-subtab counts plus a total for the parent "Connect" entry.
 */
export function useConnectBadges(): ConnectBadgeCounts {
  const { user } = useAuthContext();

  const { data: announcements = [] } = useStudentAnnouncements('', undefined);
  const { data: replies = [] } = useMyThreadReplies();
  const { data: invites = [] } = useMyInvites();
  const { data: myGroups = [] } = useMyStudyGroups();
  const lastSeenDiscussions = useDiscussionsLastSeen();

  // Discussions activity — count threads with activity newer than last seen
  const adminGroupIds = (myGroups || [])
    .filter(g => g.my_role === 'owner' || g.my_role === 'admin')
    .map(g => g.id);

  const discussionsQuery = useQuery({
    queryKey: ['connect-badges', 'discussions-recent', lastSeenDiscussions],
    queryFn: async () => {
      const sinceIso = lastSeenDiscussions
        ? new Date(lastSeenDiscussions).toISOString()
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // first visit → last 7 days
      const { count } = await supabase
        .from('discussion_threads')
        .select('id', { count: 'exact', head: true })
        .is('chapter_id', null)
        .gt('last_activity_at', sinceIso);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Pending join requests on groups where I am owner/admin
  const pendingRequestsQuery = useQuery({
    queryKey: ['connect-badges', 'pending-requests', adminGroupIds.join(',')],
    queryFn: async () => {
      if (adminGroupIds.length === 0) return 0;
      const { count } = await supabase
        .from('study_group_members')
        .select('id', { count: 'exact', head: true })
        .in('group_id', adminGroupIds)
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!user && adminGroupIds.length > 0,
    staleTime: 30_000,
  });

  const unreadAnnouncements = announcements.filter((a: any) => !a.isRead).length;

  const inquiryReplies = replies.filter(r => r.thread_type === 'inquiry' && !r.is_read).length;
  const feedbackReplies = replies.filter(r => r.thread_type === 'feedback' && !r.is_read).length;

  // Messages tab aggregates announcements + ALL unread admin replies
  const messages = unreadAnnouncements + inquiryReplies + feedbackReplies;

  const studyGroups = (invites?.length || 0) + (pendingRequestsQuery.data || 0);
  const discussions = discussionsQuery.data || 0;

  return {
    messages,
    inquiry: inquiryReplies,
    feedback: feedbackReplies,
    discussions,
    studyGroups,
    // Total avoids double-counting: messages already includes inquiry+feedback replies,
    // so the parent badge = messages + discussions + study groups activity.
    total: messages + discussions + studyGroups,
  };
}