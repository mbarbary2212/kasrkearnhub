import {
  getPerformanceTrend,
  type PerformanceTrend,
} from './classifyChapterState';
import { classifyFromMetrics, type ChapterStatus } from '@/lib/readiness';
import { classifyLearningPattern, getPatternPriorityBoost } from './classifyLearningPattern';
import { getRevisionState, getReviewType, type RevisionState } from './reviewScheduling';
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
  learningPattern?: string;
  revisionState?: RevisionState;
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

function getTrendReason(baseReason: string, trend: PerformanceTrend, state: string): string {
  if (trend === 'declining' && state !== 'not_started' && state !== 'started') {
    return 'Performance dropping';
  }
  if (trend === 'improving' && state !== 'not_started' && state !== 'started') {
    return 'Keep momentum';
  }
  return baseReason;
}

function getTrendBoost(trend: PerformanceTrend): number {
  if (trend === 'declining') return 15;
  if (trend === 'improving') return 5;
  return 0;
}

/**
 * Build prioritized dashboard suggestions from real per-chapter metrics.
 * Includes trend-aware, confidence-pattern-aware, and revision-schedule-aware logic.
 */
export function buildDashboardSuggestions(input: BuildSuggestionsInput): DashboardAction[] {
  const { metrics, chapters } = input;
  const scored: DashboardAction[] = [];

  const metricsMap = new Map(metrics.map(m => [m.chapter_id, m]));

  for (const chapter of chapters) {
    const m = metricsMap.get(chapter.id);

    const state: ChapterStatus = m ? classifyFromMetrics(m) : 'not_started';
    if (state === 'strong' && (!m || getRevisionState(m) === 'scheduled' || getRevisionState(m) === 'none')) continue;

    const trend: PerformanceTrend = m ? getPerformanceTrend(m) : 'stable';
    const trendBoost = getTrendBoost(trend);

    const patternResult = m ? classifyLearningPattern(m) : null;
    const patternBoost = patternResult ? getPatternPriorityBoost(patternResult.pattern) : 0;
    const patternLabel = patternResult?.pattern;

    // === Revision scheduling (overdue / due) ===
    if (m) {
      const revState = getRevisionState(m);
      if (revState === 'overdue' || revState === 'due') {
        const reviewType = getReviewType(state, patternLabel);
        const isOverdue = revState === 'overdue';
        const weakBoost = state === 'needs_attention' ? 10 : 0;

        let reason = isOverdue ? 'Overdue revision' : 'Due today';
        if (patternResult?.pattern === 'misconception') {
          reason = isOverdue ? 'Overdue — confident mistakes' : 'Review this concept carefully';
        }

        // Determine estimated minutes and subtab based on review type
        let subtab: string | undefined;
        let minutes = 15;
        if (reviewType === 'flashcard') { subtab = 'flashcards'; minutes = 10; }
        else if (reviewType === 'mcq') { subtab = 'mcqs'; minutes = 15; }
        else if (reviewType === 'video') { subtab = 'lectures'; minutes = 20; }

        // Strong topics get "Quick refresh" instead
        if (state === 'strong') {
          reason = 'Quick refresh';
          minutes = 5;
        }

        scored.push({
          type: reviewType === 'flashcard' ? 'flashcard' : reviewType === 'video' ? 'video' : 'review',
          title: chapter.title,
          chapterTitle: chapter.moduleName,
          reason,
          estimatedMinutes: minutes,
          moduleId: chapter.moduleId,
          chapterId: chapter.id,
          subtab,
          priority: (isOverdue ? 95 : 85) + trendBoost + weakBoost,
          state,
          trend,
          learningPattern: patternLabel,
          revisionState: revState,
        });
      }
    }

    // === Flashcards due (FSRS-level, separate from chapter-level revision) ===
    if (m && (m.flashcards_overdue > 0 || m.flashcards_due > 0)) {
      const revState = m ? getRevisionState(m) : 'none';
      // Don't duplicate if we already added a flashcard-type revision above
      if (revState !== 'overdue' && revState !== 'due') {
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
          learningPattern: patternLabel,
        });
      }
    }

    // === Not started / started ===
    if (state === 'not_started' || state === 'started') {
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

    // === Needs attention ===
    if (state === 'needs_attention') {
      let reason = getTrendReason('Low recent accuracy', trend, state);
      if (patternResult?.pattern === 'misconception') reason = patternResult.label;

      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 90 + trendBoost + patternBoost,
        state,
        trend,
        learningPattern: patternLabel,
      });
      if (chapter.hasLectures) {
        const reviewReason = patternResult?.pattern === 'misconception'
          ? 'Review this concept carefully'
          : 'Review explanation';
        scored.push({
          type: 'video',
          title: chapter.firstLectureTitle || chapter.title,
          chapterTitle: chapter.title,
          reason: reviewReason,
          estimatedMinutes: 20,
          moduleId: chapter.moduleId,
          chapterId: chapter.id,
          subtab: 'lectures',
          priority: 65 + trendBoost + patternBoost,
          state,
          trend,
          learningPattern: patternLabel,
        });
      }
      continue;
    }

    // === Building ===
    if (state === 'building') {
      let reason = getTrendReason('Needs reinforcement', trend, state);
      if (patternResult?.pattern === 'hesitant') reason = patternResult.label;

      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 75 + trendBoost + patternBoost,
        state,
        trend,
        learningPattern: patternLabel,
      });
      continue;
    }

    // === In progress ===
    {
      let reason = getTrendReason('Continue where you left', trend, state);
      if (patternResult?.pattern === 'hesitant') reason = 'Build confidence with quick practice';

      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 65 + trendBoost + patternBoost,
        state,
        trend,
        learningPattern: patternLabel,
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
  const started = metrics.filter(m => m.coverage_percent > 0 || m.mcq_attempts > 0);
  if (started.length === 0) return 0;
  const sum = started.reduce((acc, m) => acc + m.readiness_score, 0);
  return Math.round(sum / started.length);
}
