import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface UnreadAnnouncement {
  id: string;
  title: string;
  priority: string;
  created_at: string;
  module_id: string | null;
  module_name: string | null;
  module_slug: string | null;
  year_number: number | null;
}

export function useUnreadAnnouncementDetails() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['unread-announcement-details', user?.id],
    queryFn: async (): Promise<UnreadAnnouncement[]> => {
      if (!user?.id) return [];

      // Fetch active announcements with module info
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, priority, created_at, module_id, target_type')
        .eq('is_active', true)
        .eq('pending_approval', false)
        .order('created_at', { ascending: false });

      if (!announcements?.length) return [];

      // Get read announcement IDs
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', announcements.map(a => a.id));

      const readIds = new Set((reads || []).map(r => r.announcement_id));
      const unread = announcements.filter(a => !readIds.has(a.id));

      if (!unread.length) return [];

      // Fetch module details for announcements that have module_id
      const moduleIds = [...new Set(unread.map(a => a.module_id).filter(Boolean))] as string[];
      let moduleMap: Record<string, { name: string; slug: string; year_number: number | null }> = {};

      if (moduleIds.length > 0) {
        const { data: modules } = await supabase
          .from('modules')
          .select('id, name, slug, years(number)')
          .in('id', moduleIds);

        if (modules) {
          for (const m of modules) {
            moduleMap[m.id] = {
              name: m.name,
              slug: m.slug,
              year_number: (m.years as any)?.number ?? null,
            };
          }
        }
      }

      return unread.map(a => ({
        id: a.id,
        title: a.title,
        priority: a.priority,
        created_at: a.created_at,
        module_id: a.module_id,
        module_name: a.module_id ? moduleMap[a.module_id]?.name ?? null : null,
        module_slug: a.module_id ? moduleMap[a.module_id]?.slug ?? null : null,
        year_number: a.module_id ? moduleMap[a.module_id]?.year_number ?? null : null,
      }));
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}
