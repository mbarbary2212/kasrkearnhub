import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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

/**
 * Tracks student navigation position in memory and only persists to DB
 * on tab close (beforeunload) or logout — not on every navigation.
 */
export function useTrackPosition(props: TrackPositionProps) {
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin, user } = useAuthContext();
  const isStudent = !!user && !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const queryClient = useQueryClient();

  // Keep the latest position in a ref so we can flush it synchronously
  const posRef = useRef<TrackPositionProps>(props);
  const userIdRef = useRef<string | null>(user?.id ?? null);

  useEffect(() => {
    posRef.current = props;
  }, [props]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Persist using fetch + keepalive (works during unload)
  const flushPosition = useCallback(() => {
    const userId = userIdRef.current;
    const pos = posRef.current;
    if (!userId || (!pos.module_id && !pos.year_number)) return;

    const payload = {
      user_id: userId,
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

    // Use fetch with keepalive so it survives page unload
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/student_last_position?on_conflict=user_id`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Get current session token synchronously from ref or fall back to anon
    const token = sessionTokenRef.current || anonKey;

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
  }, []);

  // Keep a synchronous copy of the access token for beforeunload
  const sessionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isStudent) return;

    // Keep token ref in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionTokenRef.current = session?.access_token ?? null;

      // Flush on sign-out
      if (_event === 'SIGNED_OUT') {
        flushPosition();
      }
    });

    // Initialize token
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionTokenRef.current = session?.access_token ?? null;
    });

    // Flush on tab close / navigate away
    const handleBeforeUnload = () => {
      flushPosition();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      subscription.unsubscribe();
      // Also flush when the component unmounts (navigating away from this page within the SPA)
      // This ensures the last viewed page is saved when moving between pages
    };
  }, [isStudent, flushPosition]);

  // Also flush when the hook's host component unmounts
  // (e.g. navigating from ChapterPage to another page)
  useEffect(() => {
    if (!isStudent) return;
    return () => {
      flushPosition();
    };
  }, [isStudent, flushPosition]);
}
