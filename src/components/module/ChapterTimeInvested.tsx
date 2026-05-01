import { Clock } from 'lucide-react';
import { useStudentChapterMetrics } from '@/hooks/useStudentChapterMetrics';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ChapterTimeInvestedProps {
  chapterId: string;
  moduleId?: string;
}

/**
 * Soft-signal label shown next to the chapter readiness dot.
 * Pairs accumulated study minutes with readiness so the number is meaningful:
 *  • ≥10m + readiness <30 → "low return" (amber, coaching nudge)
 *  • ≥10m + readiness ≥70 → "invested" (muted)
 *  • Otherwise → renders nothing (avoids clutter on new chapters).
 */
export function ChapterTimeInvested({ chapterId, moduleId }: ChapterTimeInvestedProps) {
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const { data: metrics } = useStudentChapterMetrics(moduleId);

  if (!isStudent) return null;

  const metric = metrics?.find(m => m.chapter_id === chapterId);
  const minutes = metric?.minutes_total ?? 0;
  const readiness = metric?.readiness_score ?? 0;

  if (minutes < 10) return null;

  const lowReturn = readiness < 30;
  const invested = readiness >= 70;
  if (!lowReturn && !invested) return null;

  // Round to nearest 5 minutes, cap at "2h+"
  const formatted =
    minutes >= 120
      ? '2h+'
      : minutes >= 60
        ? `${Math.floor(minutes / 60)}h ${Math.round((minutes % 60) / 5) * 5}m`.replace(' 0m', '')
        : `${Math.max(5, Math.round(minutes / 5) * 5)}m`;

  return (
    <span
      className={cn(
        'hidden md:inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
        lowReturn
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'bg-muted text-muted-foreground',
      )}
      title={lowReturn
        ? `~${formatted} invested but readiness is still low — try a different study mode`
        : `~${formatted} invested · readiness strong`}
    >
      <Clock className="w-2.5 h-2.5" />
      ~{formatted}
      {lowReturn && <span className="opacity-80">· low return</span>}
    </span>
  );
}