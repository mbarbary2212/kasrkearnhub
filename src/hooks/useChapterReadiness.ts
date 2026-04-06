/**
 * Hook: useChapterReadiness
 * 
 * Composes the engagement model + readiness engine into a single hook.
 * Fetches all raw data, builds ChapterReadinessInput, and returns
 * the full ChapterReadinessResult from the unified engine.
 * 
 * Session 3: wires engagement model into the core engine.
 * Does NOT replace any existing hooks — runs in parallel.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useChapterEngagement } from './useChapterEngagement';
import {
  calculateChapterReadiness,
  type ChapterReadinessInput,
  type ChapterReadinessResult,
} from '@/lib/readiness';

interface UseChapterReadinessOptions {
  chapterId?: string;
  moduleId?: string;
  enabled?: boolean;
}

/**
 * Fetch performance + contextual metrics from student_chapter_metrics.
 */
async function fetchChapterMetrics(
  userId: string,
  chapterId: string,
) {
  const { data, error } = await supabase
    .from('student_chapter_metrics' as any)
    .select(
      'recent_mcq_accuracy, mcq_attempts, last_activity_at, ' +
      'flashcards_overdue, overconfident_error_rate, confidence_avg'
    )
    .eq('student_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Record<string, any>;
}

/**
 * Check if there are overdue flashcards for the chapter.
 */
function hasOverdueCards(metrics: Record<string, any> | null): boolean {
  if (!metrics) return false;
  return (metrics.flashcards_overdue ?? 0) > 0;
}

/**
 * Compute days since last activity.
 */
function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Derive consistency score from last activity recency (0–100).
 * Mirrors the legacy getConsistencyScore logic.
 */
function deriveConsistencyScore(lastActivityAt: string | null | undefined): number | null {
  if (!lastActivityAt) return null;
  const days = daysSince(lastActivityAt);
  if (days == null) return null;
  if (days < 3) return 100;
  if (days < 7) return 70;
  if (days < 14) return 40;
  return 15;
}

/**
 * Derive a basic retention score from flashcard state.
 * 0 overdue → 100; any overdue → scaled down.
 * Session 3 stub — refined when flashcard SRS data is richer.
 */
function deriveRetentionScore(metrics: Record<string, any> | null): number | null {
  if (!metrics) return null;
  const overdue = metrics.flashcards_overdue ?? 0;
  if (overdue === 0) return 100;
  if (overdue <= 5) return 60;
  if (overdue <= 15) return 30;
  return 10;
}

export function useChapterReadiness({
  chapterId,
  moduleId,
  enabled = true,
}: UseChapterReadinessOptions) {
  const { user } = useAuthContext();
  const { data: engagement } = useChapterEngagement(chapterId);

  return useQuery({
    queryKey: ['chapter-readiness-v2', chapterId, moduleId, user?.id],
    queryFn: async (): Promise<ChapterReadinessResult> => {
      if (!user?.id || !chapterId || !moduleId) {
        // Return a zero-state result
        return calculateChapterReadiness({
          chapterId: chapterId || '',
          moduleId: moduleId || '',
          engagementPercent: null,
          recentAccuracy: null,
          totalAttempts: 0,
          retentionScore: null,
          consistencyScore: null,
          confidenceScore: null,
          daysSinceLastActivity: null,
          hasOverdueFlashcards: false,
          overconfidentErrorRate: null,
        });
      }

      const metrics = await fetchChapterMetrics(user.id, chapterId);

      const input: ChapterReadinessInput = {
        chapterId,
        moduleId,

        // Engagement: from the multi-source model (Session 2)
        engagementPercent: engagement?.engagementPercent ?? null,

        // Performance: from student_chapter_metrics
        recentAccuracy: metrics?.recent_mcq_accuracy != null
          ? Number(metrics.recent_mcq_accuracy)
          : null,
        totalAttempts: Number(metrics?.mcq_attempts ?? 0),

        // Retention: derived from flashcard overdue state
        retentionScore: deriveRetentionScore(metrics),

        // Consistency: derived from last_activity_at recency
        consistencyScore: deriveConsistencyScore(metrics?.last_activity_at),

        // Confidence: from confidence_avg (already 0–100 scale)
        confidenceScore: metrics?.confidence_avg != null
          ? Math.round(Number(metrics.confidence_avg) * 100) / 100
          : null,

        // Contextual
        daysSinceLastActivity: daysSince(metrics?.last_activity_at),
        hasOverdueFlashcards: hasOverdueCards(metrics),
        overconfidentErrorRate: metrics?.overconfident_error_rate != null
          ? Number(metrics.overconfident_error_rate)
          : null,
      };

      return calculateChapterReadiness(input);
    },
    enabled: enabled && !!user?.id && !!chapterId && !!moduleId,
    staleTime: 30_000,
  });
}
