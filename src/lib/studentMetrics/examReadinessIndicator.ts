/**
 * Exam Readiness Indicator — Phase 3.3
 * 
 * Combines existing signals into a simple "Am I ready?" answer.
 * No new data. No complex models.
 */

// ============================================================================
// Thresholds (centralized)
// ============================================================================

export const INDICATOR_THRESHOLDS = {
  ready:            { readiness: 75, coverage: 70, accuracy: 70, maxWeakChapters: 0, maxOverdue: 2 },
  onTrack:          { readiness: 55, coverage: 50, accuracy: 55, maxWeakChapters: 2, maxOverdue: 5 },
  needsImprovement: { readiness: 30, coverage: 25, accuracy: 35, maxWeakChapters: 4, maxOverdue: 10 },
  // below needsImprovement → "Not ready"
} as const;

// ============================================================================
// Types
// ============================================================================

export type ReadinessLevel = 'ready' | 'on_track' | 'needs_improvement' | 'not_ready';

export interface ExamReadinessIndicator {
  level: ReadinessLevel;
  label: string;
  percentage: number;
  explanation: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
}

export interface IndicatorInput {
  readinessScore: number;       // 0-100
  coveragePercent: number;      // 0-100
  mcqAccuracy: number;          // 0-100  (average across chapters)
  weakChapterCount: number;
  overdueReviewCount: number;
}

// ============================================================================
// Core logic
// ============================================================================

export function buildExamReadinessIndicator(input: IndicatorInput): ExamReadinessIndicator {
  const { readinessScore, coveragePercent, mcqAccuracy, weakChapterCount, overdueReviewCount } = input;

  const level = determineLevel(input);
  const explanation = buildExplanation(input, level);

  const labelMap: Record<ReadinessLevel, string> = {
    ready: 'Ready',
    on_track: 'On track',
    needs_improvement: 'Needs improvement',
    not_ready: 'Not ready',
  };

  const colorMap: Record<ReadinessLevel, ExamReadinessIndicator['color']> = {
    ready: 'green',
    on_track: 'yellow',
    needs_improvement: 'orange',
    not_ready: 'red',
  };

  return {
    level,
    label: labelMap[level],
    percentage: readinessScore,
    explanation,
    color: colorMap[level],
  };
}

// ============================================================================
// Helpers
// ============================================================================

function determineLevel(input: IndicatorInput): ReadinessLevel {
  const { readinessScore, coveragePercent, mcqAccuracy, weakChapterCount, overdueReviewCount } = input;
  const t = INDICATOR_THRESHOLDS;

  // "Ready" — all signals strong
  if (
    readinessScore >= t.ready.readiness &&
    coveragePercent >= t.ready.coverage &&
    mcqAccuracy >= t.ready.accuracy &&
    weakChapterCount <= t.ready.maxWeakChapters &&
    overdueReviewCount <= t.ready.maxOverdue
  ) {
    return 'ready';
  }

  // "On track" — solid progress
  if (
    readinessScore >= t.onTrack.readiness &&
    coveragePercent >= t.onTrack.coverage &&
    mcqAccuracy >= t.onTrack.accuracy &&
    weakChapterCount <= t.onTrack.maxWeakChapters &&
    overdueReviewCount <= t.onTrack.maxOverdue
  ) {
    return 'on_track';
  }

  // "Needs improvement" — some progress
  if (
    readinessScore >= t.needsImprovement.readiness &&
    coveragePercent >= t.needsImprovement.coverage
  ) {
    return 'needs_improvement';
  }

  return 'not_ready';
}

function buildExplanation(input: IndicatorInput, level: ReadinessLevel): string {
  const { coveragePercent, mcqAccuracy, weakChapterCount, overdueReviewCount } = input;

  // Pick the most relevant single explanation
  if (level === 'ready') {
    if (overdueReviewCount > 0) {
      return 'Strong overall — just a few reviews pending';
    }
    return 'Good coverage, strong performance, and consistent study';
  }

  if (level === 'not_ready') {
    if (coveragePercent < 20) {
      return 'Just getting started — keep building coverage';
    }
    if (weakChapterCount > 3) {
      return 'Multiple weak chapters still need work';
    }
    return 'More coverage and practice needed';
  }

  // on_track or needs_improvement — pick dominant gap
  const gaps: { priority: number; msg: string }[] = [];

  if (weakChapterCount >= 3) {
    gaps.push({ priority: 1, msg: `${weakChapterCount} weak chapters need attention` });
  }
  if (overdueReviewCount >= 5) {
    gaps.push({ priority: 2, msg: 'Review is piling up — stay on schedule' });
  }
  if (mcqAccuracy < 55 && mcqAccuracy > 0) {
    gaps.push({ priority: 3, msg: 'MCQ performance could be stronger' });
  }
  if (coveragePercent < 50) {
    gaps.push({ priority: 4, msg: 'Good start, but more content to cover' });
  }

  if (gaps.length > 0) {
    gaps.sort((a, b) => a.priority - b.priority);
    return gaps[0].msg;
  }

  if (level === 'on_track') {
    return 'Good coverage but some areas still need strengthening';
  }
  return 'Making progress — focus on weak areas and reviews';
}
