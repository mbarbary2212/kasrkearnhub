import {
  classifyChapterState,
  getPerformanceTrend,
  type ChapterState,
  type PerformanceTrend,
} from './classifyChapterState';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';

export interface DashboardAction {
  type: 'resume' | 'read' | 'video' | 'mcq' | 'flashcard' | 'review';
  title: string;
  reason: string;
  estimatedMinutes?: number;
  moduleId?: string;
  chapterId?: string;
  chapterTitle?: string;
  subtab?: string;
  priority: number;
  isPrimary?: boolean;
  state?: string;
  trend?: PerformanceTrend;
}

export interface WeakTopic {
  chapterId: string;
  chapterTitle: string;
  moduleId: string;
  accuracy: number;
  attempts: number;
  trend?: PerformanceTrend;
}

interface ChapterInfo {
  id: string;
  title: string;
  moduleId: string;
  moduleName: string;
  hasLectures: boolean;
  firstLectureTitle?: string;
}

interface BuildSuggestionsInput {
  metrics: StudentChapterMetric[];
  chapters: ChapterInfo[];
}

/**
 * Get trend-aware reason string for a suggestion.
 */
function getTrendReason(baseReason: string, trend: PerformanceTrend, state: string): string {
  if (trend === 'declining' && state !== 'not_started' && state !== 'early') {
    return 'Performance dropping';
  }
  if (trend === 'improving' && state !== 'not_started' && state !== 'early') {
    return 'Keep momentum';
  }
  return baseReason;
}

/**
 * Get trend-based priority boost.
 */
function getTrendBoost(trend: PerformanceTrend): number {
  if (trend === 'declining') return 15;
  if (trend === 'improving') return 5;
  return 0;
}

/**
 * Build prioritized dashboard suggestions from real per-chapter metrics.
 * Single source of truth for Home dashboard and module Study Coach.
 * Includes trend-aware reasons and priority adjustments.
 */
export function buildDashboardSuggestions(input: BuildSuggestionsInput): DashboardAction[] {
  const { metrics, chapters } = input;
  const scored: DashboardAction[] = [];

  // Build metrics lookup
  const metricsMap = new Map(metrics.map(m => [m.chapter_id, m]));

  for (const chapter of chapters) {
    const m = metricsMap.get(chapter.id);

    const state: ChapterState = m
      ? classifyChapterState(m)
      : 'not_started';

    if (state === 'strong') continue;

    const trend: PerformanceTrend = m ? getPerformanceTrend(m) : 'stable';
    const trendBoost = getTrendBoost(trend);

    // Rule E — Revision due (flashcards)
    if (m && (m.flashcards_overdue > 0 || m.flashcards_due > 0)) {
      const isOverdue = m.flashcards_overdue > 0;
      scored.push({
        type: 'flashcard',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason: isOverdue ? 'Overdue revision' : 'Due today',
        estimatedMinutes: 10,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        priority: (isOverdue ? 95 : 85) + trendBoost,
        state,
        trend,
      });
    }

    // Rule B — Not started / early
    if (state === 'not_started' || state === 'early') {
      if (chapter.hasLectures) {
        scored.push({
          type: 'video',
          title: chapter.firstLectureTitle || chapter.title,
          chapterTitle: chapter.title,
          reason: 'Start here',
          estimatedMinutes: 20,
          moduleId: chapter.moduleId,
          chapterId: chapter.id,
          subtab: 'lectures',
          priority: 80,
          state,
          trend,
        });
      }
      scored.push({
        type: 'read',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason: 'Build understanding',
        estimatedMinutes: 30,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        priority: 70,
        state,
        trend,
      });
      if (m && m.coverage_percent >= 30) {
        scored.push({
          type: 'mcq',
          title: chapter.title,
          chapterTitle: chapter.moduleName,
          reason: 'Try some questions',
          estimatedMinutes: 15,
          moduleId: chapter.moduleId,
          chapterId: chapter.id,
          subtab: 'mcqs',
          priority: 40,
          state,
          trend,
        });
      }
      continue;
    }

    // Rule C — Weak
    if (state === 'weak') {
      const reason = getTrendReason('Low recent accuracy', trend, state);
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 90 + trendBoost,
        state,
        trend,
      });
      if (chapter.hasLectures) {
        scored.push({
          type: 'video',
          title: chapter.firstLectureTitle || chapter.title,
          chapterTitle: chapter.title,
          reason: 'Review explanation',
          estimatedMinutes: 20,
          moduleId: chapter.moduleId,
          chapterId: chapter.id,
          subtab: 'lectures',
          priority: 65 + trendBoost,
          state,
          trend,
        });
      }
      continue;
    }

    // Rule D — Unstable
    if (state === 'unstable') {
      const reason = getTrendReason('Needs reinforcement', trend, state);
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 75 + trendBoost,
        state,
        trend,
      });
      continue;
    }

    // in_progress
    {
      const reason = getTrendReason('Continue where you left', trend, state);
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 65 + trendBoost,
        state,
        trend,
      });
    }
  }

  // Sort by priority descending
  scored.sort((a, b) => b.priority - a.priority);

  // Deduplicate: max 1 per type
  const seen = new Set<string>();
  const deduped: DashboardAction[] = [];
  for (const item of scored) {
    if (!seen.has(item.type)) {
      seen.add(item.type);
      deduped.push(item);
    }
  }

  // Top 3
  const top = deduped.slice(0, 3);
  if (top.length > 0) {
    top[0].isPrimary = true;
  }

  return top;
}

/**
 * Get truly weak topics from real per-chapter metrics.
 * Includes chapters with >=5 attempts AND (recent accuracy <60 OR declining trend).
 */
export function getWeakTopics(
  metrics: StudentChapterMetric[],
  chapterTitleMap: Map<string, string>,
): WeakTopic[] {
  return metrics
    .filter(m => {
      if (m.mcq_attempts < 5) return false;
      const trend = getPerformanceTrend(m);
      return m.recent_mcq_accuracy < 60 || trend === 'declining';
    })
    .sort((a, b) => a.recent_mcq_accuracy - b.recent_mcq_accuracy || b.mcq_attempts - a.mcq_attempts)
    .slice(0, 3)
    .map(m => ({
      chapterId: m.chapter_id,
      chapterTitle: chapterTitleMap.get(m.chapter_id) || 'Unknown Chapter',
      moduleId: m.module_id,
      accuracy: Math.round(m.recent_mcq_accuracy),
      attempts: m.mcq_attempts,
      trend: getPerformanceTrend(m),
    }));
}

/**
 * Calculate aggregate readiness from chapter metrics.
 */
export function calculateAggregateReadiness(metrics: StudentChapterMetric[]): number {
  const started = metrics.filter(m =>
    m.coverage_percent > 0 || m.mcq_attempts > 0
  );
  if (started.length === 0) return 0;

  const sum = started.reduce((acc, m) => acc + m.readiness_score, 0);
  return Math.round(sum / started.length);
}
