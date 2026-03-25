export type ChapterState =
  | 'not_started'
  | 'early'
  | 'weak'
  | 'unstable'
  | 'strong'
  | 'in_progress';

export type PerformanceTrend = 'declining' | 'stable' | 'improving';

export interface ChapterMetricsInput {
  coverage_percent: number;
  mcq_attempts: number;
  mcq_accuracy: number;
  recent_mcq_accuracy: number;
  readiness_score: number;
  flashcards_due?: number;
  flashcards_overdue?: number;
  last_activity_at?: string | null;
}

/**
 * Calculate performance trend: recent vs overall accuracy.
 */
export function getPerformanceTrend(m: ChapterMetricsInput): PerformanceTrend {
  if (m.mcq_attempts < 5) return 'stable'; // not enough data
  const trend = m.recent_mcq_accuracy - m.mcq_accuracy;
  if (trend < -10) return 'declining';
  if (trend > 10) return 'improving';
  return 'stable';
}

/**
 * Calculate consistency score based on last activity recency.
 */
export function getConsistencyScore(lastActivityAt: string | null | undefined): number {
  if (!lastActivityAt) return 0;
  const daysSince = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 3) return 100;
  if (daysSince < 7) return 70;
  return 30;
}

/**
 * Classify a chapter's learning state from real per-chapter metrics.
 * Single source of truth — used by dashboard, Study Coach, and module cards.
 *
 * Weak detection includes trend: declining chapters (trend < -10) are
 * flagged as weak even if average accuracy looks OK.
 */
export function classifyChapterState(m: ChapterMetricsInput): ChapterState {
  if (m.coverage_percent === 0 && m.mcq_attempts < 3) return 'not_started';
  if (m.coverage_percent < 40 && m.mcq_attempts < 5) return 'early';

  if (m.mcq_attempts >= 5) {
    const trend = getPerformanceTrend(m);
    // Weak: low recent accuracy OR declining trend
    if (m.recent_mcq_accuracy < 60 || trend === 'declining') return 'weak';
    if (m.recent_mcq_accuracy < 75) return 'unstable';
  }

  if (m.readiness_score >= 75) return 'strong';
  return 'in_progress';
}

/**
 * Calculate chapter readiness using weighted formula.
 * 0.30 coverage + 0.40 recent accuracy + 0.20 revision + 0.10 consistency
 */
export function calculateChapterReadiness(m: ChapterMetricsInput): number {
  // Revision score
  let revisionScore = 100;
  if (m.flashcards_overdue && m.flashcards_overdue > 0) {
    revisionScore = 20;
  } else if (m.flashcards_due && m.flashcards_due > 0) {
    revisionScore = 60;
  }

  const consistency = getConsistencyScore(m.last_activity_at);

  const readiness =
    0.30 * m.coverage_percent +
    0.40 * m.recent_mcq_accuracy +
    0.20 * revisionScore +
    0.10 * consistency;

  return Math.round(Math.min(100, Math.max(0, readiness)));
}

/**
 * Derive a module-level status from aggregated chapter metrics.
 */
export function getModuleStatusFromMetrics(
  chapterStates: ChapterState[],
  avgReadiness: number,
): 'not_started' | 'weak' | 'strong' | 'in_progress' {
  if (chapterStates.length === 0) return 'not_started';
  if (chapterStates.every(s => s === 'not_started')) return 'not_started';

  const started = chapterStates.filter(s => s !== 'not_started');
  const weakCount = started.filter(s => s === 'weak').length;

  if (started.length > 0 && weakCount / started.length >= 0.3) return 'weak';
  if (avgReadiness >= 75) return 'strong';
  return 'in_progress';
}
