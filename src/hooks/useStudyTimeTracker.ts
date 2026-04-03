import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

type ActivityType = 'reading' | 'watching' | 'practicing' | 'cases';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const FLUSH_THRESHOLD_SECONDS = 60;   // flush to DB every 60s accumulated
const IDLE_TIMEOUT_MS = 120_000;      // 2 minutes idle → pause
const ROLLUP_INTERVAL_MS = 300_000;   // rollup every 5 minutes

/**
 * Tracks active study time via heartbeat.
 * Pauses on tab hidden, window blur, idle > 2 min, or `paused` prop.
 * Flushes to `study_time_events` max once per minute.
 * Triggers rollup to `student_chapter_metrics` on unmount or every 5 min.
 */
export function useStudyTimeTracker(
  chapterId: string | undefined,
  moduleId: string | undefined,
  activityType: ActivityType,
  paused = false,
) {
  const { user } = useAuthContext();
  const accumulatedRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);
  const firstActiveRef = useRef<string | null>(null);
  const rollupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track user activity for idle detection
  const onUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Flush accumulated time to DB
  const flush = useCallback(async () => {
    if (!user?.id || !chapterId || !moduleId) return;
    const seconds = accumulatedRef.current;
    if (seconds < 1) return;
    accumulatedRef.current = 0;

    try {
      await supabase.from('study_time_events' as any).insert({
        user_id: user.id,
        chapter_id: chapterId,
        module_id: moduleId,
        activity_type: activityType,
        duration_seconds: seconds,
        session_date: new Date().toISOString().split('T')[0],
        first_active_at: firstActiveRef.current || new Date().toISOString(),
      });
    } catch {
      // Re-add on failure so time isn't lost
      accumulatedRef.current += seconds;
    }
  }, [user?.id, chapterId, moduleId, activityType]);

  // Rollup: aggregate study_time_events into student_chapter_metrics
  const rollup = useCallback(async () => {
    if (!user?.id || !chapterId || !moduleId) return;

    try {
      const { data } = await supabase
        .from('study_time_events' as any)
        .select('activity_type, duration_seconds')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId);

      if (!data || data.length === 0) return;

      const totals: Record<string, number> = { reading: 0, watching: 0, practicing: 0, cases: 0 };
      for (const row of data as any[]) {
        const key = row.activity_type as string;
        if (key in totals) totals[key] += row.duration_seconds || 0;
      }

      const minutesReading = Math.round(totals.reading / 60);
      const minutesWatching = Math.round(totals.watching / 60);
      const minutesPracticing = Math.round((totals.practicing + totals.cases) / 60);
      const minutesTotal = minutesReading + minutesWatching + minutesPracticing;

      await supabase.rpc('upsert_student_chapter_metrics', {
        p_student_id: user.id,
        p_module_id: moduleId,
        p_chapter_id: chapterId,
        p_minutes_reading: minutesReading,
        p_minutes_watching: minutesWatching,
        p_minutes_practicing: minutesPracticing,
        p_minutes_total: minutesTotal,
        p_last_activity_at: new Date().toISOString(),
      });
    } catch {
      // Non-critical
    }
  }, [user?.id, chapterId, moduleId]);

  useEffect(() => {
    if (!user?.id || !chapterId || !moduleId || paused) return;

    // Set first active timestamp
    if (!firstActiveRef.current) {
      firstActiveRef.current = new Date().toISOString();
    }

    // Visibility & focus handlers
    const onVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
    };
    const onFocus = () => { isActiveRef.current = true; };
    const onBlur = () => { isActiveRef.current = false; };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('mousemove', onUserActivity);
    document.addEventListener('keydown', onUserActivity);
    document.addEventListener('scroll', onUserActivity);

    // Heartbeat: tick every 30s
    const heartbeat = setInterval(() => {
      const isIdle = Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS;
      if (!isActiveRef.current || isIdle || paused) return;

      accumulatedRef.current += HEARTBEAT_INTERVAL_MS / 1000;

      // Flush when accumulated >= threshold
      if (accumulatedRef.current >= FLUSH_THRESHOLD_SECONDS) {
        flush();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Rollup timer: every 5 minutes
    rollupTimerRef.current = setInterval(rollup, ROLLUP_INTERVAL_MS);

    return () => {
      clearInterval(heartbeat);
      if (rollupTimerRef.current) clearInterval(rollupTimerRef.current);

      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('mousemove', onUserActivity);
      document.removeEventListener('keydown', onUserActivity);
      document.removeEventListener('scroll', onUserActivity);

      // Flush remaining + rollup on unmount
      flush().then(rollup);
    };
  }, [user?.id, chapterId, moduleId, paused, flush, rollup, onUserActivity]);
}
