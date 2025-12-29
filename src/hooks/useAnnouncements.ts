import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_type: 'all' | 'module' | 'year';
  module_id: string | null;
  year_id: string | null;
  priority: 'normal' | 'important' | 'urgent';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  // Joined data
  modules?: { name: string } | null;
  years?: { name: string } | null;
  profiles?: { full_name: string | null; email: string } | null;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

// Fetch announcements for students (filtered by module/year context)
export function useStudentAnnouncements(moduleId?: string, yearId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['student-announcements', moduleId, yearId, user?.id],
    queryFn: async () => {
      // Fetch active announcements
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: announcements, error } = await query;
      if (error) throw error;

      // Filter announcements based on context
      const filtered = (announcements || []).filter((a: Announcement) => {
        // Global announcements always show
        if (a.target_type === 'all') return true;
        // Module-specific announcements
        if (a.target_type === 'module' && a.module_id === moduleId) return true;
        // Year-specific announcements
        if (a.target_type === 'year' && a.year_id === yearId) return true;
        return false;
      });

      // Fetch read status for current user
      if (user?.id && filtered.length > 0) {
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id)
          .in('announcement_id', filtered.map((a: Announcement) => a.id));

        const readIds = new Set((reads || []).map(r => r.announcement_id));
        return filtered.map((a: Announcement) => ({
          ...a,
          isRead: readIds.has(a.id),
        }));
      }

      return filtered.map((a: Announcement) => ({ ...a, isRead: false }));
    },
    enabled: !!user?.id,
  });
}

// Fetch all announcements for admin management
export function useAdminAnnouncements() {
  const { user, isPlatformAdmin, isSuperAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          modules(name),
          years(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles separately
      const creatorIds = [...new Set((data || []).map(a => a.created_by).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', creatorIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string }>);
      }

      return (data || []).map(a => ({
        ...a,
        profiles: a.created_by ? profilesMap[a.created_by] || null : null,
      })) as Announcement[];
    },
    enabled: !!user?.id && (isPlatformAdmin || isSuperAdmin),
  });
}

// Fetch module-specific announcements for module admin
export function useModuleAnnouncements(moduleId: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['module-announcements', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles separately
      const creatorIds = [...new Set((data || []).map(a => a.created_by).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', creatorIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string }>);
      }

      return (data || []).map(a => ({
        ...a,
        profiles: a.created_by ? profilesMap[a.created_by] || null : null,
      })) as Announcement[];
    },
    enabled: !!user?.id && !!moduleId,
  });
}

// Create announcement
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      target_type: 'all' | 'module' | 'year';
      module_id?: string | null;
      year_id?: string | null;
      priority?: 'normal' | 'important' | 'urgent';
      expires_at?: string | null;
    }) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { error } = await supabase.from('announcements').insert({
        title: data.title,
        content: data.content,
        target_type: data.target_type,
        module_id: data.module_id || null,
        year_id: data.year_id || null,
        priority: data.priority || 'normal',
        expires_at: data.expires_at || null,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['module-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['student-announcements'] });
      toast.success('Announcement created successfully');
    },
    onError: (error) => {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    },
  });
}

// Update announcement
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      content?: string;
      priority?: 'normal' | 'important' | 'urgent';
      is_active?: boolean;
      expires_at?: string | null;
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['module-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['student-announcements'] });
      toast.success('Announcement updated successfully');
    },
    onError: (error) => {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    },
  });
}

// Delete announcement
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['module-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['student-announcements'] });
      toast.success('Announcement deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    },
  });
}

// Mark announcement as read
export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { error } = await supabase.from('announcement_reads').insert({
        announcement_id: announcementId,
        user_id: user.id,
      });

      // Ignore duplicate error (already read)
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-announcements'] });
    },
  });
}
