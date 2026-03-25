export type ChapterState =
  | 'not_started'
  | 'early'
  | 'weak'
  | 'unstable'
  | 'strong'
  | 'in_progress';

export interface ChapterMetricsInput {
  coverage_percent: number;
  mcq_attempts: number;
  recent_mcq_accuracy: number;
  readiness_score: number;
  flashcards_due?: number;
  flashcards_overdue?: number;
}

/**
 * Classify a chapter's learning state from real per-chapter metrics.
 * Single source of truth — used by dashboard, Study Coach, and module cards.
 */
export function classifyChapterState(m: ChapterMetricsInput): ChapterState {
  if (m.coverage_percent === 0 && m.mcq_attempts < 3) return 'not_started';
  if (m.coverage_percent < 40 && m.mcq_attempts < 5) return 'early';
  if (m.mcq_attempts >= 5 && m.recent_mcq_accuracy < 60) return 'weak';
  if (m.mcq_attempts >= 5 && m.recent_mcq_accuracy < 75) return 'unstable';
  if (m.readiness_score >= 75) return 'strong';
  return 'in_progress';
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
