import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentUsageOverviewRow {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string | null;
  status: string;
  last_seen: string | null;
  sessions_30d: number;
  active_days_30d: number;
  total_time_all: number; // seconds
  total_time_30d: number;
  total_time_7d: number;
  top_module_id: string | null;
  top_module_name: string | null;
  top_module_minutes: number;
  mcq_attempts_30d: number;
}

export function useStudentUsageOverview() {
  return useQuery({
    queryKey: ['student-usage-overview'],
    queryFn: async (): Promise<StudentUsageOverviewRow[]> => {
      const now = Date.now();
      const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const iso30 = d30.toISOString();

      const [profilesRes, rolesRes, sessionsRes, steRes, mcqRes, modulesRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, avatar_url, status').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('user_sessions').select('user_id, session_start, last_seen_at, duration_seconds'),
        supabase.from('study_time_events').select('user_id, module_id, duration_seconds, session_date'),
        supabase.from('question_attempts').select('user_id, created_at').gte('created_at', iso30),
        supabase.from('modules').select('id, name'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (steRes.error) throw steRes.error;

      const roleMap = new Map<string, string>();
      (rolesRes.data ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const moduleName = new Map<string, string>();
      (modulesRes.data ?? []).forEach((m: any) => moduleName.set(m.id, m.name));

      // Aggregate sessions per user
      const sessAgg = new Map<string, {
        last_seen: Date | null;
        sessions_30d: number;
        active_days: Set<string>;
        total_all: number;
        total_30d: number;
        total_7d: number;
      }>();
      (sessionsRes.data ?? []).forEach((s: any) => {
        const start = new Date(s.session_start);
        const last = new Date(s.last_seen_at ?? s.session_start);
        const dur = s.duration_seconds ?? Math.max(0, Math.floor((last.getTime() - start.getTime()) / 1000));
        let a = sessAgg.get(s.user_id);
        if (!a) {
          a = { last_seen: null, sessions_30d: 0, active_days: new Set(), total_all: 0, total_30d: 0, total_7d: 0 };
          sessAgg.set(s.user_id, a);
        }
        if (!a.last_seen || last > a.last_seen) a.last_seen = last;
        a.total_all += dur;
        if (start >= d30) {
          a.sessions_30d += 1;
          a.total_30d += dur;
          a.active_days.add(start.toISOString().slice(0, 10));
        }
        if (start >= d7) a.total_7d += dur;
      });

      // Aggregate study_time_events per user+module (seconds)
      const perUserModule = new Map<string, Map<string, number>>();
      (steRes.data ?? []).forEach((e: any) => {
        if (!e.module_id) return;
        let m = perUserModule.get(e.user_id);
        if (!m) { m = new Map(); perUserModule.set(e.user_id, m); }
        m.set(e.module_id, (m.get(e.module_id) ?? 0) + (e.duration_seconds ?? 0));
      });

      const mcq30 = new Map<string, number>();
      (mcqRes.data ?? []).forEach((r: any) => mcq30.set(r.user_id, (mcq30.get(r.user_id) ?? 0) + 1));

      const rows: StudentUsageOverviewRow[] = (profilesRes.data ?? []).map((p: any) => {
        const a = sessAgg.get(p.id);
        let topId: string | null = null;
        let topSec = 0;
        const mm = perUserModule.get(p.id);
        if (mm) mm.forEach((sec, id) => { if (sec > topSec) { topSec = sec; topId = id; } });
        return {
          user_id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          role: roleMap.get(p.id) ?? null,
          status: p.status ?? 'active',
          last_seen: a?.last_seen?.toISOString() ?? null,
          sessions_30d: a?.sessions_30d ?? 0,
          active_days_30d: a?.active_days.size ?? 0,
          total_time_all: a?.total_all ?? 0,
          total_time_30d: a?.total_30d ?? 0,
          total_time_7d: a?.total_7d ?? 0,
          top_module_id: topId,
          top_module_name: topId ? moduleName.get(topId) ?? null : null,
          top_module_minutes: Math.round(topSec / 60),
          mcq_attempts_30d: mcq30.get(p.id) ?? 0,
        };
      });

      return rows;
    },
    staleTime: 60_000,
  });
}
