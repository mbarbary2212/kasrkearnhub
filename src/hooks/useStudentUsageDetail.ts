import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentUsageDetail {
  profile: { id: string; full_name: string | null; email: string; avatar_url: string | null; role: string | null } | null;
  summary: {
    total_time_all: number;
    total_time_30d: number;
    total_time_7d: number;
    sessions_all: number;
    sessions_30d: number;
    active_days_30d: number;
    avg_session_seconds: number;
    longest_session_seconds: number;
    last_seen: string | null;
    first_seen: string | null;
    mcq_attempts_30d: number;
    mcq_attempts_all: number;
  };
  dailyMinutes: Array<{ date: string; minutes: number; sessions: number }>; // last 30 days
  perModule: Array<{ module_id: string; module_name: string; minutes_all: number; minutes_30d: number }>;
  topChapters: Array<{ chapter_id: string; chapter_title: string; module_name: string; minutes: number; last_activity: string | null }>;
  activitySplit: Array<{ activity_type: string; minutes: number }>;
}

export function useStudentUsageDetail(userId: string | null) {
  return useQuery({
    queryKey: ['student-usage-detail', userId],
    enabled: !!userId,
    queryFn: async (): Promise<StudentUsageDetail> => {
      const uid = userId!;
      const now = Date.now();
      const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

      const [profileRes, roleRes, sessionsRes, steRes, mcqRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url').eq('id', uid).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', uid).maybeSingle(),
        supabase.from('user_sessions').select('session_start, last_seen_at, duration_seconds').eq('user_id', uid),
        supabase.from('study_time_events').select('module_id, chapter_id, activity_type, duration_seconds, session_date, first_active_at').eq('user_id', uid),
        supabase.from('question_attempts').select('created_at').eq('user_id', uid),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (steRes.error) throw steRes.error;

      const sessions = sessionsRes.data ?? [];
      const ste = steRes.data ?? [];

      // Session summary
      let totalAll = 0, total30 = 0, total7 = 0;
      let sess30 = 0;
      const activeDays = new Set<string>();
      let lastSeen: Date | null = null;
      let firstSeen: Date | null = null;
      let longest = 0;
      const durations: number[] = [];
      const dailyMap = new Map<string, { minutes: number; sessions: number }>();

      sessions.forEach((s: any) => {
        const start = new Date(s.session_start);
        const last = new Date(s.last_seen_at ?? s.session_start);
        const dur = s.duration_seconds ?? Math.max(0, Math.floor((last.getTime() - start.getTime()) / 1000));
        durations.push(dur);
        totalAll += dur;
        if (!lastSeen || last > lastSeen) lastSeen = last;
        if (!firstSeen || start < firstSeen) firstSeen = start;
        if (dur > longest) longest = dur;
        if (start >= d30) {
          sess30 += 1;
          total30 += dur;
          const key = start.toISOString().slice(0, 10);
          activeDays.add(key);
          const cur = dailyMap.get(key) ?? { minutes: 0, sessions: 0 };
          cur.minutes += Math.round(dur / 60);
          cur.sessions += 1;
          dailyMap.set(key, cur);
        }
        if (start >= d7) total7 += dur;
      });

      const avgSess = durations.length ? Math.floor(totalAll / durations.length) : 0;

      // Fill 30-day daily buckets
      const dailyMinutes: Array<{ date: string; minutes: number; sessions: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        const v = dailyMap.get(key) ?? { minutes: 0, sessions: 0 };
        dailyMinutes.push({ date: key, minutes: v.minutes, sessions: v.sessions });
      }

      // Per-module aggregation
      const moduleIds = new Set<string>();
      const chapterIds = new Set<string>();
      ste.forEach((e: any) => {
        if (e.module_id) moduleIds.add(e.module_id);
        if (e.chapter_id) chapterIds.add(e.chapter_id);
      });

      const [modulesRes, chaptersRes] = await Promise.all([
        moduleIds.size
          ? supabase.from('modules').select('id, name').in('id', Array.from(moduleIds))
          : Promise.resolve({ data: [] as any[], error: null }),
        chapterIds.size
          ? supabase.from('module_chapters').select('id, title, module_id').in('id', Array.from(chapterIds))
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const modName = new Map<string, string>();
      (modulesRes.data ?? []).forEach((m: any) => modName.set(m.id, m.name));
      const chapInfo = new Map<string, { title: string; module_id: string }>();
      (chaptersRes.data ?? []).forEach((c: any) => chapInfo.set(c.id, { title: c.title, module_id: c.module_id }));

      const modAgg = new Map<string, { all: number; d30: number }>();
      const chapAgg = new Map<string, { seconds: number; last: Date | null }>();
      const actSplit = new Map<string, number>();

      ste.forEach((e: any) => {
        const sec = e.duration_seconds ?? 0;
        const sessDate = e.session_date ? new Date(e.session_date) : null;
        if (e.module_id) {
          const cur = modAgg.get(e.module_id) ?? { all: 0, d30: 0 };
          cur.all += sec;
          if (sessDate && sessDate >= d30) cur.d30 += sec;
          modAgg.set(e.module_id, cur);
        }
        if (e.chapter_id) {
          const cur = chapAgg.get(e.chapter_id) ?? { seconds: 0, last: null };
          cur.seconds += sec;
          const evT = e.first_active_at ? new Date(e.first_active_at) : sessDate;
          if (evT && (!cur.last || evT > cur.last)) cur.last = evT;
          chapAgg.set(e.chapter_id, cur);
        }
        if (e.activity_type) {
          actSplit.set(e.activity_type, (actSplit.get(e.activity_type) ?? 0) + sec);
        }
      });

      const perModule = Array.from(modAgg.entries())
        .map(([id, v]) => ({
          module_id: id,
          module_name: modName.get(id) ?? 'Unknown module',
          minutes_all: Math.round(v.all / 60),
          minutes_30d: Math.round(v.d30 / 60),
        }))
        .sort((a, b) => b.minutes_all - a.minutes_all);

      const topChapters = Array.from(chapAgg.entries())
        .map(([id, v]) => {
          const info = chapInfo.get(id);
          return {
            chapter_id: id,
            chapter_title: info?.title ?? 'Unknown chapter',
            module_name: info ? modName.get(info.module_id) ?? '—' : '—',
            minutes: Math.round(v.seconds / 60),
            last_activity: v.last ? v.last.toISOString() : null,
          };
        })
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 10);

      const activitySplit = Array.from(actSplit.entries())
        .map(([activity_type, seconds]) => ({ activity_type, minutes: Math.round(seconds / 60) }))
        .sort((a, b) => b.minutes - a.minutes);

      const mcqAll = (mcqRes.data ?? []).length;
      const mcq30 = (mcqRes.data ?? []).filter((r: any) => new Date(r.created_at) >= d30).length;

      return {
        profile: profileRes.data
          ? { ...profileRes.data, role: roleRes.data?.role ?? null }
          : null,
        summary: {
          total_time_all: totalAll,
          total_time_30d: total30,
          total_time_7d: total7,
          sessions_all: sessions.length,
          sessions_30d: sess30,
          active_days_30d: activeDays.size,
          avg_session_seconds: avgSess,
          longest_session_seconds: longest,
          last_seen: lastSeen ? (lastSeen as Date).toISOString() : null,
          first_seen: firstSeen ? (firstSeen as Date).toISOString() : null,
          mcq_attempts_30d: mcq30,
          mcq_attempts_all: mcqAll,
        },
        dailyMinutes,
        perModule,
        topChapters,
        activitySplit,
      };
    },
    staleTime: 30_000,
  });
}
