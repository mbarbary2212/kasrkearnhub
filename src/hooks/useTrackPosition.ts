import { useEffect, useRef } from 'react';
import { useSaveLastPosition } from '@/hooks/useLastPosition';
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

/**
 * Hook that auto-saves student navigation position when deps change.
 * Only fires for students (non-admin/non-teacher).
 */
export function useTrackPosition(props: TrackPositionProps) {
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin, user } = useAuthContext();
  const save = useSaveLastPosition();
  const isStudent = !!user && !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const lastSaved = useRef('');

  useEffect(() => {
    if (!isStudent) return;

    // Build a fingerprint to avoid duplicate saves
    const fingerprint = JSON.stringify(props);
    if (fingerprint === lastSaved.current) return;
    lastSaved.current = fingerprint;

    // Only save if we have at least a module or year
    if (!props.module_id && !props.year_number) return;

    save.mutate({
      year_number: props.year_number ?? null,
      module_id: props.module_id ?? null,
      module_name: props.module_name ?? null,
      module_slug: props.module_slug ?? null,
      book_label: props.book_label ?? null,
      chapter_id: props.chapter_id ?? null,
      chapter_title: props.chapter_title ?? null,
      tab: props.tab ?? null,
      activity_position: props.activity_position ?? null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, JSON.stringify(props)]);
}
