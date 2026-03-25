import { useChapterProgress } from '@/hooks/useChapterProgress';
import { useAuthContext } from '@/contexts/AuthContext';

interface ChapterReadinessDotProps {
  chapterId: string;
}

/**
 * 8px filled circle indicating chapter readiness at a glance.
 * Grey = not started, Amber = in progress (<80%), Green = ≥80%.
 * Only renders for students.
 */
export function ChapterReadinessDot({ chapterId }: ChapterReadinessDotProps) {
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const { data } = useChapterProgress(isStudent ? chapterId : undefined);

  if (!isStudent) return null;

  const progress = data?.totalProgress ?? 0;
  const total = data?.totalItems ?? 0;

  // Grey: no activity at all
  // Amber: started but < 80%
  // Green: >= 80%
  const color =
    total === 0 || (progress === 0 && total > 0)
      ? 'bg-gray-300 dark:bg-gray-600'
      : progress >= 80
        ? 'bg-green-500'
        : 'bg-amber-500';

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${color}`}
      aria-label={`Chapter readiness: ${Math.round(progress)}%`}
    />
  );
}
