import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserWithAnalytics {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  banned_until: string | null;
  status_reason: string | null;
  role: string | null;
  last_seen: string | null;
  sessions_30d: number;
  total_time_7d: number;
  total_time_30d: number;
  total_time_all: number;
}

export function useUserAnalytics() {
  return useQuery({
    queryKey: ['user-analytics'],
    queryFn: async () => {
      // First get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          status,
          banned_until,
          status_reason
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Ensure profiles is never undefined
      const safeProfiles = profiles || [];

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Ensure roles is never undefined
      const safeRoles = roles || [];

      // Get session analytics for all users
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('user_id, session_start, last_seen_at, duration_seconds');

      if (sessionsError) throw sessionsError;

      // Ensure sessions is never undefined
      const safeSessions = sessions || [];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Build analytics map
      const analyticsMap = new Map<string, {
        last_seen: string | null;
        sessions_30d: number;
        total_time_7d: number;
        total_time_30d: number;
        total_time_all: number;
      }>();

      const sessionsByUser = new Map<string, typeof safeSessions>();
      safeSessions.forEach(session => {
        if (!sessionsByUser.has(session.user_id)) {
          sessionsByUser.set(session.user_id, []);
        }
        sessionsByUser.get(session.user_id)!.push(session);
      });

      sessionsByUser.forEach((userSessions, userId) => {
        let lastSeen: Date | null = null;
        let sessions30d = 0;
        let totalTime7d = 0;
        let totalTime30d = 0;
        let totalTimeAll = 0;

        userSessions.forEach(session => {
          const sessionStart = new Date(session.session_start);
          const lastSeenAt = new Date(session.last_seen_at);
          
          // Track last seen
          if (!lastSeen || lastSeenAt > lastSeen) {
            lastSeen = lastSeenAt;
          }

          // Calculate duration (use stored or compute from timestamps)
          const duration = session.duration_seconds ?? 
            Math.floor((Math.min(lastSeenAt.getTime(), now.getTime()) - sessionStart.getTime()) / 1000);

          totalTimeAll += duration;

          if (sessionStart >= thirtyDaysAgo) {
            sessions30d++;
            totalTime30d += duration;
          }

          if (sessionStart >= sevenDaysAgo) {
            totalTime7d += duration;
          }
        });

        analyticsMap.set(userId, {
          last_seen: lastSeen?.toISOString() || null,
          sessions_30d: sessions30d,
          total_time_7d: totalTime7d,
          total_time_30d: totalTime30d,
          total_time_all: totalTimeAll,
        });
      });

      // Merge data
      const rolesMap = new Map<string, string>();
      safeRoles.forEach(r => rolesMap.set(r.user_id, r.role));

      const usersWithAnalytics: UserWithAnalytics[] = safeProfiles.map(profile => {
        const analytics = analyticsMap.get(profile.id) || {
          last_seen: null,
          sessions_30d: 0,
          total_time_7d: 0,
          total_time_30d: 0,
          total_time_all: 0,
        };

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          status: profile.status || 'active',
          banned_until: profile.banned_until,
          status_reason: profile.status_reason,
          role: rolesMap.get(profile.id) || null,
          ...analytics,
        };
      });

      return usersWithAnalytics;

      return usersWithAnalytics;
    },
  });
}

export function useAdminActions(targetUserId?: string) {
  return useQuery({
    queryKey: ['admin-actions', targetUserId],
    queryFn: async () => {
      let query = supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false });

      if (targetUserId) {
        query = query.eq('target_user_id', targetUserId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId || true,
  });
}
