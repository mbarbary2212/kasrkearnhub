import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';

export type LearningPattern =
  | 'misconception'  // Wrong + high confidence → dangerous
  | 'hesitant'       // Right + low confidence → needs encouragement
  | 'fragile'        // Borderline accuracy → needs reinforcement
  | 'mastering'      // High accuracy + aligned confidence
  | 'unclear';       // Not enough signal

export interface LearningPatternResult {
  pattern: LearningPattern;
  label: string;
  reason: string;
}

/**
 * Classify the learning pattern for a chapter based on confidence metrics.
 * Uses chapter-level aggregates from student_chapter_metrics.
 */
export function classifyLearningPattern(m: StudentChapterMetric): LearningPatternResult {
  // Need enough attempts to classify
  if (m.mcq_attempts < 5) {
    return { pattern: 'unclear', label: 'Insufficient data', reason: '' };
  }

  const accuracy = m.recent_mcq_accuracy;
  const overconfident = m.overconfident_error_rate ?? 0;
  const underconfident = m.underconfident_correct_rate ?? 0;
  const mismatch = m.confidence_mismatch_rate ?? 0;

  // Misconception: low accuracy AND high overconfidence
  if (accuracy < 60 && overconfident >= 25) {
    return {
      pattern: 'misconception',
      label: 'Confident mistakes detected',
      reason: 'Review this concept carefully',
    };
  }

  // Hesitant: decent accuracy but low confidence
  if (accuracy >= 60 && underconfident >= 30) {
    return {
      pattern: 'hesitant',
      label: 'You know this, but hesitate',
      reason: 'Build confidence with quick practice',
    };
  }

  // Fragile: borderline accuracy
  if (accuracy >= 60 && accuracy < 75) {
    return {
      pattern: 'fragile',
      label: 'Needs reinforcement',
      reason: 'Needs reinforcement',
    };
  }

  // Mastering: high accuracy + low mismatch
  if (accuracy >= 75 && mismatch < 20) {
    return {
      pattern: 'mastering',
      label: 'Keep momentum',
      reason: 'Keep momentum',
    };
  }

  return { pattern: 'unclear', label: '', reason: '' };
}

/**
 * Get the priority boost for a learning pattern.
 */
export function getPatternPriorityBoost(pattern: LearningPattern): number {
  switch (pattern) {
    case 'misconception': return 20;
    case 'hesitant': return 10;
    case 'fragile': return 5;
    default: return 0;
  }
}

/**
 * Generate a smart insight string from the strongest signal in chapter metrics.
 * Returns null if no strong signal is detected.
 */
export function generateConfidenceInsight(
  metrics: StudentChapterMetric[],
  chapterTitleMap: Map<string, string>,
): string | null {
  // Find strongest misconception signal
  const misconceptions = metrics
    .filter(m => m.mcq_attempts >= 5 && (m.overconfident_error_rate ?? 0) >= 25 && m.recent_mcq_accuracy < 60)
    .sort((a, b) => (b.overconfident_error_rate ?? 0) - (a.overconfident_error_rate ?? 0));

  if (misconceptions.length > 0) {
    const m = misconceptions[0];
    const title = chapterTitleMap.get(m.chapter_id) || 'a chapter';
    return `Confident mistakes in ${title} — review before more MCQs`;
  }

  // Find strongest hesitant signal
  const hesitant = metrics
    .filter(m => m.mcq_attempts >= 5 && (m.underconfident_correct_rate ?? 0) >= 30 && m.recent_mcq_accuracy >= 60)
    .sort((a, b) => (b.underconfident_correct_rate ?? 0) - (a.underconfident_correct_rate ?? 0));

  if (hesitant.length > 0) {
    const m = hesitant[0];
    const title = chapterTitleMap.get(m.chapter_id) || 'a chapter';
    return `You're getting questions right in ${title} but with low confidence`;
  }

  return null;
}
