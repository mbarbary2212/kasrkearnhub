import type { QualitySignals } from '@/hooks/useContentQualitySignals';

// ── Thresholds (adjust here) ──────────────────────────────
export const MIN_REACTIONS = 5;
export const NEGATIVE_RATIO_REVIEW = 0.3;
export const NEGATIVE_RATIO_HIGH = 0.5;
export const FEEDBACK_COUNT_REVIEW = 3;
export const INCORRECT_COUNT_REVIEW = 1;
export const INCORRECT_COUNT_HIGH = 2;

// ── Types ─────────────────────────────────────────────────
export type ContentQualityFlag = 'normal' | 'needs_review' | 'high_priority';

export interface ContentQualityResult {
  flag: ContentQualityFlag;
  reasons: string[];
}

// ── Scoring engine ────────────────────────────────────────
export function computeContentQualityFlag(signals: QualitySignals | undefined | null): ContentQualityResult {
  if (!signals) return { flag: 'normal', reasons: [] };

  const { helpful_count, unhelpful_count, feedback_count, feedback_types } = signals;
  const totalReactions = helpful_count + unhelpful_count;
  const negativeRatio = totalReactions > 0 ? unhelpful_count / totalReactions : 0;
  const incorrectCount = feedback_types?.incorrect_content ?? 0;

  const highReasons: string[] = [];
  const reviewReasons: string[] = [];

  // High-priority checks
  if (totalReactions >= MIN_REACTIONS && negativeRatio > NEGATIVE_RATIO_HIGH) {
    highReasons.push(`High negative ratio (${Math.round(negativeRatio * 100)}%)`);
  }
  if (incorrectCount >= INCORRECT_COUNT_HIGH) {
    highReasons.push(`${incorrectCount} incorrect content reports`);
  }

  // Needs-review checks
  if (totalReactions >= MIN_REACTIONS && negativeRatio > NEGATIVE_RATIO_REVIEW) {
    reviewReasons.push(`Negative ratio ${Math.round(negativeRatio * 100)}% (≥${Math.round(NEGATIVE_RATIO_REVIEW * 100)}%)`);
  }
  if (feedback_count >= FEEDBACK_COUNT_REVIEW) {
    reviewReasons.push(`${feedback_count} total feedback reports`);
  }
  if (incorrectCount >= INCORRECT_COUNT_REVIEW) {
    reviewReasons.push(`${incorrectCount} incorrect content report${incorrectCount > 1 ? 's' : ''}`);
  }

  if (highReasons.length > 0) {
    return { flag: 'high_priority', reasons: highReasons };
  }
  if (reviewReasons.length > 0) {
    return { flag: 'needs_review', reasons: reviewReasons };
  }
  return { flag: 'normal', reasons: [] };
}

// ── Helpers ───────────────────────────────────────────────
export function getQualityFlagLabel(flag: ContentQualityFlag): string {
  switch (flag) {
    case 'high_priority': return 'High Priority';
    case 'needs_review': return 'Needs Review';
    default: return 'Normal';
  }
}

export function getQualityFlagColor(flag: ContentQualityFlag): string {
  switch (flag) {
    case 'high_priority': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'needs_review': return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
    default: return '';
  }
}
