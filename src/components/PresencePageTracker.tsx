import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePresence } from '@/contexts/PresenceContext';

/**
 * Tracks the user's current page for Supabase Realtime presence.
 * Renders null — purely a side-effect component.
 * Topic/Chapter pages override this with more detailed context.
 */
export function PresencePageTracker() {
  const { updatePresence } = usePresence();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path === '/') {
      updatePresence({ page: 'home' });
    } else if (path.startsWith('/year/')) {
      updatePresence({ page: 'year' });
    } else if (
      path.startsWith('/module/') &&
      !path.includes('/topic/') &&
      !path.includes('/chapter/')
    ) {
      if (
        path.includes('/mock-exam') ||
        path.includes('/blueprint-exam') ||
        path.includes('/exam-results')
      ) {
        updatePresence({ page: 'exam' });
      } else {
        updatePresence({ page: 'module' });
      }
    } else if (path.startsWith('/review/flashcards') || path.startsWith('/review/mcqs')) {
      updatePresence({ page: 'practice' });
    } else if (path.startsWith('/virtual-patient/')) {
      updatePresence({ page: 'virtual_patient' });
    } else if (path.startsWith('/case-summary/')) {
      updatePresence({ page: 'case_summary' });
    } else if (
      path === '/progress' ||
      path === '/account' ||
      path === '/feedback' ||
      path.startsWith('/admin')
    ) {
      updatePresence({ page: 'other' });
    }
    // /module/:id/topic/:id and /module/:id/chapter/:id are handled
    // by TopicDetailPage and ChapterPage with richer context
  }, [location.pathname, updatePresence]);

  return null;
}
