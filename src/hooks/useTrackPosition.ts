import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseUrl';

interface TrackPositionProps {
  year_number?: number | null;
  module_id?: string | null;
  module_name?: string | null;
  module_slug?: string | null;
  book_label?: string | null;
  chapter_id?: string | null;
  chapter_title?: string | null;
  tab?: string | null;
  activity_position?: Record<string, unknown> | null;
}

// Global ref so multiple instances share one latest position
let globalPosition: (TrackPositionProps & { userId: string }) | null = null;
let listenerAttached = false;
let globalAccessToken: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function buildPayload(pos: typeof globalPosition) {
  if (!pos || (!pos.module_id && !pos.year_number)) return null;
  return {
    user_id: pos.userId,
    year_number: pos.year_number ?? null,
    module_id: pos.module_id ?? null,
    module_name: pos.module_name ?? null,
    module_slug: pos.module_slug ?? null,
    book_label: pos.book_label ?? null,
    chapter_id: pos.chapter_id ?? null,
    chapter_title: pos.chapter_title ?? null,
    tab: pos.tab ?? null,
    activity_position: pos.activity_position ?? null,
    updated_at: new Date().toISOString(),
  };
}

function flushGlobalPosition() {
  const payload = buildPayload(globalPosition);
  if (!payload) return;

  const url = `${SUPABASE_URL}/rest/v1/student_last_position?on_conflict=user_id`;
  const token = globalAccessToken || SUPABASE_ANON_KEY;

  fetch(url, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  }).catch(() => {/* best-effort */});
}

/** Debounced flush — saves after 2s of no new updates */
function scheduleDebouncedFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushGlobalPosition();
    flushTimer = null;
  }, 2000);
}

/**
 * Tracks student navigation position in memory and persists to DB:
 * - Debounced (2s) on every navigation change
 * - Immediately on tab/browser close (beforeunload)
 * - On logout (SIGNED_OUT)
 */
export function useTrackPosition(props: TrackPositionProps) {
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin, user } = useAuthContext();
  const isStudent = !!user && !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;

  // Update global position whenever props change (in-memory + debounced flush)
  useEffect(() => {
    if (!isStudent || !user?.id) return;
    if (!props.module_id && !props.year_number) return;
    globalPosition = { ...props, userId: user.id };
    scheduleDebouncedFlush();
  }, [isStudent, user?.id, JSON.stringify(props)]);

  // Attach global listeners once
  useEffect(() => {
    if (!isStudent || listenerAttached) return;
    listenerAttached = true;

    // Keep access token in sync for beforeunload
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      globalAccessToken = session?.access_token ?? null;
      if (_event === 'SIGNED_OUT') {
        flushGlobalPosition();
        globalPosition = null;
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      globalAccessToken = session?.access_token ?? null;
    });

    const handleBeforeUnload = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushGlobalPosition();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      subscription.unsubscribe();
      listenerAttached = false;
    };
  }, [isStudent]);
}
