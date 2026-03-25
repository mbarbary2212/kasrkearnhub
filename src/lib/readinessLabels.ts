import { BookOpen, FlaskConical, Play, PenLine, GalleryHorizontal } from 'lucide-react';

/**
 * Get a descriptive readiness label based on percentage.
 */
export function getReadinessLabel(readiness: number): string {
  if (readiness >= 90) return 'Exam ready';
  if (readiness >= 76) return 'Near ready';
  if (readiness >= 51) return 'Improving';
  if (readiness >= 21) return 'Building';
  return 'Early stage';
}

/**
 * Get module status based on coverage and accuracy.
 */
export function getModuleStatus(
  readiness: number | null | undefined
): { label: string; variant: 'default' | 'weak' | 'strong' | 'progress' } {
  if (readiness == null || readiness <= 0) {
    return { label: 'Not started', variant: 'default' };
  }
  if (readiness < 20) {
    return { label: 'Weak', variant: 'weak' };
  }
  if (readiness >= 70) {
    return { label: 'Strong', variant: 'strong' };
  }
  return { label: 'In progress', variant: 'progress' };
}

/**
 * Get the icon component for a resume position based on the tab/sub_tab.
 */
export function getResumeIconName(tab?: string | null, subTab?: string | null): string {
  if (subTab === 'lectures' || subTab === 'videos') return 'video';
  if (tab === 'practice' || subTab === 'mcqs' || subTab === 'osce' || subTab === 'essays') return 'practice';
  if (subTab === 'flashcards') return 'flashcard';
  return 'reading';
}
