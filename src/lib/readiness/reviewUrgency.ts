/**
 * Session 7 — Review Urgency
 *
 * Classifies each chapter into an urgency tier with a human-readable
 * reason and suggested action.  Evaluated top-down (first match wins).
 *
 * Urgency tiers are intentionally ordered for easy sorting:
 *   review_now (0) > review_soon (1) > on_track (2) > low_priority (3)
 */

import { REVIEW_URGENCY_THRESHOLDS } from './config';
import type {
  ChapterStatus,
  ComponentScores,
  EvidenceLevel,
  ReviewUrgency,
  ReviewUrgencyResult,
  RiskFlag,
} from './types';

// ── Sortable numeric priority (lower = more urgent) ─────────────────────

export const URGENCY_SORT_ORDER: Record<ReviewUrgency, number> = {
  review_now: 0,
  review_soon: 1,
  on_track: 2,
  low_priority: 3,
};

// ── Helpers ─────────────────────────────────────────────────────────────

function hasFlag(flags: RiskFlag[], type: string): RiskFlag | undefined {
  return flags.find((f) => f.flag === type);
}

function hasHighSeverity(flags: RiskFlag[]): boolean {
  return flags.some((f) => f.severity === 'high');
}

function hasMediumOrHighSeverity(flags: RiskFlag[]): boolean {
  return flags.some((f) => f.severity === 'high' || f.severity === 'medium');
}

const NOT_STARTED_STATUSES: ChapterStatus[] = ['not_started'];

function isStarted(status: ChapterStatus): boolean {
  return !NOT_STARTED_STATUSES.includes(status);
}

// ── Result builder ──────────────────────────────────────────────────────

function result(
  urgency: ReviewUrgency,
  reason: string,
  suggestedAction: string,
): ReviewUrgencyResult {
  return { urgency, reason, suggestedAction };
}

// ── Main ────────────────────────────────────────────────────────────────

export function determineReviewUrgency(
  chapterStatus: ChapterStatus,
  riskFlags: RiskFlag[],
  daysSinceLastActivity: number | null,
  evidenceLevel: EvidenceLevel,
  componentScores: ComponentScores,
): ReviewUrgencyResult {
  const days = daysSinceLastActivity ?? 0;
  const started = isStarted(chapterStatus);
  const { reviewNowInactiveDays, reviewSoonInactiveDays } = REVIEW_URGENCY_THRESHOLDS;

  // ── Not started → low priority ──────────────────────────────────────
  if (!started) {
    return result(
      'low_priority',
      'Chapter not yet started.',
      'Start this chapter when ready.',
    );
  }

  // ── review_now checks (first match wins) ────────────────────────────

  // 1. needs_attention + high-severity flag
  if (chapterStatus === 'needs_attention' && hasHighSeverity(riskFlags)) {
    return result(
      'review_now',
      'Performance issues require immediate attention.',
      'Review weak areas and retry practice questions.',
    );
  }

  // 2. Long inactivity on a started chapter
  if (days >= reviewNowInactiveDays) {
    return result(
      'review_now',
      `No activity for ${days} days — knowledge may have decayed.`,
      'Do a quick review session to refresh your memory.',
    );
  }

  // 3. Weak performance with high severity
  const weakPerf = hasFlag(riskFlags, 'weak_performance');
  if (weakPerf && weakPerf.severity === 'high') {
    return result(
      'review_now',
      'Recent accuracy is critically low.',
      'Focus on understanding core concepts before more practice.',
    );
  }

  // ── review_soon checks ──────────────────────────────────────────────

  // 4. Overdue revision flag
  if (hasFlag(riskFlags, 'overdue_revision')) {
    return result(
      'review_soon',
      'Flashcards are overdue for revision.',
      'Complete your pending flashcard reviews.',
    );
  }

  // 5. Moderate inactivity
  if (days >= reviewSoonInactiveDays) {
    return result(
      'review_soon',
      `${days} days since last activity — consider a refresher.`,
      'Spend a few minutes reviewing key material.',
    );
  }

  // 6. Weak performance medium severity
  if (weakPerf && weakPerf.severity === 'medium') {
    return result(
      'review_soon',
      'Recent accuracy is below expectations.',
      'Review mistakes from recent practice sessions.',
    );
  }

  // 7. needs_attention fallback (without high severity)
  if (chapterStatus === 'needs_attention') {
    return result(
      'review_soon',
      'This chapter needs more work to reach readiness.',
      'Revisit challenging topics and practice again.',
    );
  }

  // ── low_priority checks ─────────────────────────────────────────────

  // 8. Strong / ready with no medium+ flags
  if (
    (chapterStatus === 'strong' || chapterStatus === 'ready') &&
    !hasMediumOrHighSeverity(riskFlags)
  ) {
    return result(
      'low_priority',
      chapterStatus === 'strong'
        ? 'Excellent mastery — maintain with occasional review.'
        : 'Good progress — on track for readiness.',
      chapterStatus === 'strong'
        ? 'Keep up periodic reviews to stay sharp.'
        : 'Continue current study pace.',
    );
  }

  // ── on_track (default) ──────────────────────────────────────────────
  return result(
    'on_track',
    'Progressing steadily — no urgent action needed.',
    'Continue your current study plan.',
  );
}
