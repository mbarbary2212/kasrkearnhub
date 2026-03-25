import { classifyChapterState, type ChapterState } from './classifyChapterState';
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
}

export interface WeakTopic {
  chapterId: string;
  chapterTitle: string;
  moduleId: string;
  accuracy: number;
  attempts: number;
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
 * Build prioritized dashboard suggestions from real per-chapter metrics.
 * Single source of truth for Home dashboard and module Study Coach.
 */
export function buildDashboardSuggestions(input: BuildSuggestionsInput): DashboardAction[] {
  const { metrics, chapters } = input;
  const scored: DashboardAction[] = [];

  // Create lookup for chapter info
  const chapterMap = new Map(chapters.map(c => [c.id, c]));

  // Build metrics lookup for chapters that have metrics rows
  const metricsMap = new Map(metrics.map(m => [m.chapter_id, m]));

  // Process each chapter
  for (const chapter of chapters) {
    const m = metricsMap.get(chapter.id);

    // If no metrics row exists, treat as not_started
    const state: ChapterState = m
      ? classifyChapterState(m)
      : 'not_started';

    if (state === 'strong') continue;

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
        priority: isOverdue ? 95 : 85,
        state,
      });
    }

    // Rule B — Not started / early
    if (state === 'not_started' || state === 'early') {
      if (chapter.hasLectures) {
        scored.push({
          type: 'video',
          title: chapter.firstLectureTitle || chapter.title,
          chapterTitle: chapter.title,
          reason: 'Not covered yet',
          estimatedMinutes: 20,
          moduleId: chapter.moduleId,
          chapterId: chapter.id,
          subtab: 'lectures',
          priority: 80,
          state,
        });
      }
      scored.push({
        type: 'read',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason: 'Build core understanding',
        estimatedMinutes: 30,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        priority: 70,
        state,
      });
      // MCQ only if some coverage exists
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
        });
      }
      continue;
    }

    // Rule C — Weak
    if (state === 'weak') {
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason: 'Low recent accuracy',
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 90,
        state,
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
          priority: 65,
          state,
        });
      }
      continue;
    }

    // Rule D — Unstable
    if (state === 'unstable') {
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason: 'Needs reinforcement',
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 75,
        state,
      });
      continue;
    }

    // in_progress
    scored.push({
      type: 'mcq',
      title: chapter.title,
      chapterTitle: chapter.moduleName,
      reason: 'Continue where you left',
      estimatedMinutes: 15,
      moduleId: chapter.moduleId,
      chapterId: chapter.id,
      subtab: 'mcqs',
      priority: 65,
      state,
    });
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
 * Only includes chapters with >=5 attempts AND <60% recent accuracy.
 */
export function getWeakTopics(
  metrics: StudentChapterMetric[],
  chapterTitleMap: Map<string, string>,
): WeakTopic[] {
  return metrics
    .filter(m => m.mcq_attempts >= 5 && m.recent_mcq_accuracy < 60)
    .sort((a, b) => a.recent_mcq_accuracy - b.recent_mcq_accuracy || b.mcq_attempts - a.mcq_attempts)
    .slice(0, 3)
    .map(m => ({
      chapterId: m.chapter_id,
      chapterTitle: chapterTitleMap.get(m.chapter_id) || 'Unknown Chapter',
      moduleId: m.module_id,
      accuracy: Math.round(m.recent_mcq_accuracy),
      attempts: m.mcq_attempts,
    }));
}

/**
 * Calculate aggregate readiness from chapter metrics.
 * Uses weighted average of readiness_score across chapters with activity.
 */
export function calculateAggregateReadiness(metrics: StudentChapterMetric[]): number {
  const started = metrics.filter(m =>
    m.coverage_percent > 0 || m.mcq_attempts > 0
  );
  if (started.length === 0) return 0;

  const sum = started.reduce((acc, m) => acc + m.readiness_score, 0);
  return Math.round(sum / started.length);
}
