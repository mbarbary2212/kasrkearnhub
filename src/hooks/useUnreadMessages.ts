import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface UnreadCounts {
  announcements: number;
  replies: number;
  total: number;
}

export function useUnreadMessages(moduleId?: string, yearId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['unread-messages', moduleId, yearId, user?.id],
    queryFn: async (): Promise<UnreadCounts> => {
      if (!user?.id) return { announcements: 0, replies: 0, total: 0 };

      // Fetch active announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, target_type, module_id, year_id')
        .eq('is_active', true)
        .eq('pending_approval', false);

      // Filter announcements based on context
      const filteredAnnouncements = (announcements || []).filter((a) => {
        if (a.target_type === 'all') return true;
        if (a.target_type === 'module' && a.module_id === moduleId) return true;
        if (a.target_type === 'year' && a.year_id === yearId) return true;
        return false;
      });

      // Get read announcements for current user
      let unreadAnnouncementCount = 0;
      if (filteredAnnouncements.length > 0) {
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id)
          .in('announcement_id', filteredAnnouncements.map((a) => a.id));

        const readIds = new Set((reads || []).map(r => r.announcement_id));
        unreadAnnouncementCount = filteredAnnouncements.filter(a => !readIds.has(a.id)).length;
      }

      // Count inquiries with admin replies (resolved or with admin_notes)
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select('id, status, admin_notes, resolved_at')
        .eq('user_id', user.id);

      // Count inquiries that have been resolved or have admin notes (i.e., have replies)
      const repliesCount = (inquiries || []).filter(
        i => i.status === 'resolved' || (i.admin_notes && i.admin_notes.trim().length > 0)
      ).length;

      return {
        announcements: unreadAnnouncementCount,
        replies: repliesCount,
        total: unreadAnnouncementCount + repliesCount,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });
}
