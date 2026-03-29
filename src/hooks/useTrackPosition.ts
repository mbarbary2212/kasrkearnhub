import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

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

function flushGlobalPosition() {
  const pos = globalPosition;
  if (!pos || (!pos.module_id && !pos.year_number)) return;

  const payload = {
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

  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/student_last_position?on_conflict=user_id`;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const token = globalAccessToken || anonKey;

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

let globalAccessToken: string | null = null;

/**
 * Tracks student navigation position in memory and only persists to DB
 * on tab/browser close (beforeunload) or logout — NOT on every navigation.
 */
export function useTrackPosition(props: TrackPositionProps) {
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin, user } = useAuthContext();
  const isStudent = !!user && !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;

  // Update global position whenever props change (in-memory only, no DB call)
  useEffect(() => {
    if (!isStudent || !user?.id) return;
    if (!props.module_id && !props.year_number) return;
    globalPosition = { ...props, userId: user.id };
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
