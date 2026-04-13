import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';

export type RevisionState = 'overdue' | 'due' | 'scheduled' | 'none';

/**
 * Determine the revision state for a chapter based on next_review_at.
 */
export function getRevisionState(m: StudentChapterMetric): RevisionState {
  const nextReview = (m as any).next_review_at;
  if (!nextReview) return 'none';

  const now = Date.now();
  const reviewTime = new Date(nextReview).getTime();

  if (reviewTime < now) return 'overdue';

  // Due within 24 hours
  const in24h = now + 24 * 60 * 60 * 1000;
  if (reviewTime <= in24h) return 'due';

  return 'scheduled';
}

/**
 * Calculate review strength client-side (mirrors DB calculation).
 * review_strength = 0.6 * recent_mcq_accuracy + 0.4 * confidence_alignment
 */
export function calculateReviewStrength(m: StudentChapterMetric): number {
  const confidenceAlignment = Math.max(0, Math.min(100, 100 - (m.confidence_mismatch_rate ?? 0)));
  let strength = 0.6 * m.recent_mcq_accuracy + 0.4 * confidenceAlignment;

  // Apply decay if inactive > 7 days
  if (m.last_activity_at) {
    const daysSince = (Date.now() - new Date(m.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 14) strength *= 0.8;
    else if (daysSince > 7) strength *= 0.9;
  }

  return Math.round(Math.min(100, Math.max(0, strength)));
}

/**
 * Get the suggested review type based on chapter status and learning pattern.
 */
export function getReviewType(
  status: string,
  learningPattern?: string,
): 'mcq' | 'flashcard' | 'video' | 'read' {
  if (learningPattern === 'misconception') return 'video'; // review content first
  if (status === 'needs_attention') return 'mcq'; // MCQ + explanation
  if (status === 'strong' || status === 'building' || status === 'ready') return 'flashcard'; // quick review
  return 'mcq';
}

/**
 * Get chapters that are due or overdue for review, sorted by priority.
 */
export function getDueReviewChapters(
  metrics: StudentChapterMetric[],
  chapterTitleMap: Map<string, string>,
): Array<{
  chapterId: string;
  chapterTitle: string;
  moduleId: string;
  revisionState: RevisionState;
  reviewStrength: number;
  daysSinceActivity: number;
}> {
  return metrics
    .filter(m => {
      const state = getRevisionState(m);
      return state === 'overdue' || state === 'due';
    })
    .map(m => {
      const daysSince = m.last_activity_at
        ? (Date.now() - new Date(m.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      return {
        chapterId: m.chapter_id,
        chapterTitle: chapterTitleMap.get(m.chapter_id) || 'Unknown',
        moduleId: m.module_id,
        revisionState: getRevisionState(m),
        reviewStrength: (m as any).review_strength ?? 0,
        daysSinceActivity: Math.round(daysSince),
      };
    })
    .sort((a, b) => {
      // Overdue before due
      if (a.revisionState !== b.revisionState) {
        return a.revisionState === 'overdue' ? -1 : 1;
      }
      // Lower strength = higher priority
      return a.reviewStrength - b.reviewStrength;
    });
}
