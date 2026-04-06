import {
  getPerformanceTrend,
  type PerformanceTrend,
} from './classifyChapterState';
import { classifyFromMetrics, type ChapterStatus } from '@/lib/readiness';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { getExamWeightBoost, type ChapterExamWeight } from '@/hooks/useChapterExamWeights';

// ─── Types ────────────────────────────────────────────────────

export interface CoachInsight {
  type: 'priority' | 'misallocation' | 'trend' | 'strength' | 'confidence' | 'time_balance';
  message: string;
  /** Higher = more important, show first */
  priority: number;
  chapterId?: string;
  /** Actionable suggestion text */
  action?: string;
  /** Route to navigate to */
  actionRoute?: string;
}

export interface CoachInsightInput {
  metrics: StudentChapterMetric[];
  chapterTitleMap: Map<string, string>;
  examWeightMap?: Map<string, ChapterExamWeight>;
  moduleId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

interface ClassifiedChapter {
  id: string;
  title: string;
  state: ChapterStatus;
  trend: PerformanceTrend;
  metric: StudentChapterMetric;
  examBoost: number;
  isHighYield: boolean;
}

function classify(input: CoachInsightInput): ClassifiedChapter[] {
  return input.metrics
    .filter(m => m.mcq_attempts >= 1) // need some data
    .map(m => {
      const state = classifyFromMetrics(m);
      const trend = getPerformanceTrend(m);
      const examBoost = getExamWeightBoost(m.chapter_id, input.examWeightMap);
      return {
        id: m.chapter_id,
        title: input.chapterTitleMap.get(m.chapter_id) || 'Unknown',
        state,
        trend,
        metric: m,
        examBoost,
        isHighYield: examBoost >= 1.4,
      };
    });
}

function chapterRoute(moduleId: string | undefined, chapterId: string, tab?: string, subtab?: string): string | undefined {
  if (!moduleId) return undefined;
  let route = `/modules/${moduleId}/chapters/${chapterId}`;
  if (tab) route += `?section=${tab}`;
  if (subtab) route += `&subtab=${subtab}`;
  return route;
}

// ─── Insight generators (each returns 0-1 insight) ────────────

function priorityInsight(chapters: ClassifiedChapter[], moduleId?: string): CoachInsight | null {
  // needs_attention + high-yield = top priority
  const weakHighYield = chapters
    .filter(c => c.state === 'needs_attention' && c.isHighYield)
    .sort((a, b) => b.examBoost - a.examBoost);

  if (weakHighYield.length > 0) {
    const ch = weakHighYield[0];
    return {
      type: 'priority',
      message: `${ch.title} is a high-yield chapter where you're struggling. Focus here first.`,
      priority: 100,
      chapterId: ch.id,
      action: `Try 10 MCQs in ${ch.title}`,
      actionRoute: chapterRoute(moduleId, ch.id, 'practice', 'mcqs'),
    };
  }

  // needs_attention but not high-yield
  const weak = chapters
    .filter(c => c.state === 'needs_attention')
    .sort((a, b) => a.metric.recent_mcq_accuracy - b.metric.recent_mcq_accuracy);

  if (weak.length > 0) {
    const ch = weak[0];
    return {
      type: 'priority',
      message: `${ch.title} needs attention — your recent accuracy is ${Math.round(ch.metric.recent_mcq_accuracy)}%.`,
      priority: 85,
      chapterId: ch.id,
      action: `Practice MCQs in ${ch.title}`,
      actionRoute: chapterRoute(moduleId, ch.id, 'practice', 'mcqs'),
    };
  }

  return null;
}

function misallocationInsight(chapters: ClassifiedChapter[], moduleId?: string): CoachInsight | null {
  const neglectedHighYield = chapters.filter(
    c => c.isHighYield && (c.state === 'needs_attention' || c.state === 'building' || c.state === 'started') && c.metric.mcq_attempts < 10
  );

  const overStudied = chapters.filter(
    c => !c.isHighYield && c.examBoost < 1.0 && c.metric.mcq_attempts >= 15 && (c.state === 'strong' || c.metric.recent_mcq_accuracy >= 80)
  );

  if (neglectedHighYield.length > 0 && overStudied.length > 0) {
    const neglected = neglectedHighYield[0];
    return {
      type: 'misallocation',
      message: `Consider shifting time to ${neglected.title} — it carries more exam weight and needs work.`,
      priority: 80,
      chapterId: neglected.id,
      action: `Start practicing ${neglected.title}`,
      actionRoute: chapterRoute(moduleId, neglected.id, 'practice'),
    };
  }

  return null;
}

function trendInsight(chapters: ClassifiedChapter[], moduleId?: string): CoachInsight | null {
  // Declining chapters
  const declining = chapters
    .filter(c => c.trend === 'declining' && c.state !== 'needs_attention' && c.metric.mcq_attempts >= 5)
    .sort((a, b) => b.examBoost - a.examBoost);

  if (declining.length > 0) {
    const ch = declining[0];
    return {
      type: 'trend',
      message: `Your performance in ${ch.title} is declining — revise before it worsens.`,
      priority: 75,
      chapterId: ch.id,
      action: `Review ${ch.title} notes`,
      actionRoute: chapterRoute(moduleId, ch.id, 'resources'),
    };
  }

  // Improving chapters
  const improving = chapters
    .filter(c => c.trend === 'improving' && c.state !== 'strong' && c.metric.mcq_attempts >= 5)
    .sort((a, b) => b.examBoost - a.examBoost);

  if (improving.length > 0) {
    const ch = improving[0];
    return {
      type: 'trend',
      message: `${ch.title} is improving — keep up the momentum.`,
      priority: 50,
      chapterId: ch.id,
      action: `Keep practicing ${ch.title}`,
      actionRoute: chapterRoute(moduleId, ch.id, 'practice'),
    };
  }

  return null;
}

function strengthInsight(chapters: ClassifiedChapter[]): CoachInsight | null {
  const strong = chapters.filter(c => c.state === 'strong');

  if (strong.length === 0) return null;

  if (strong.length >= 3) {
    return {
      type: 'strength',
      message: `You're strong in ${strong.length} chapters — maintain with light review.`,
      priority: 30,
      action: 'Do a quick review of strong chapters',
    };
  }

  const ch = strong[0];
  return {
    type: 'strength',
    message: `${ch.title} is a strength — maintain with light review.`,
    priority: 30,
    chapterId: ch.id,
    action: 'Keep it up with occasional practice',
  };
}

function confidenceInsight(chapters: ClassifiedChapter[], moduleId?: string): CoachInsight | null {
  const overconfident = chapters.filter(
    c => c.metric.mcq_attempts >= 5 && (c.metric.overconfident_error_rate ?? 0) >= 25
  );

  if (overconfident.length > 0) {
    const ch = overconfident.sort(
      (a, b) => (b.metric.overconfident_error_rate ?? 0) - (a.metric.overconfident_error_rate ?? 0)
    )[0];
    return {
      type: 'confidence',
      message: `You may be overconfident in ${ch.title} — review carefully before practicing more.`,
      priority: 70,
      chapterId: ch.id,
      action: `Re-read ${ch.title} before more MCQs`,
      actionRoute: chapterRoute(moduleId, ch.id, 'resources'),
    };
  }

  return null;
}

function timeBalanceInsight(metrics: StudentChapterMetric[]): CoachInsight | null {
  let totalWatching = 0;
  let totalPracticing = 0;

  for (const m of metrics) {
    totalWatching += m.minutes_watching ?? 0;
    totalPracticing += m.minutes_practicing ?? 0;
  }

  // Only trigger if there's meaningful activity
  if (totalWatching + totalPracticing < 10) return null;

  if (totalWatching > totalPracticing * 2 && totalPracticing < 30) {
    return {
      type: 'time_balance',
      message: "You're spending more time watching than practicing — active recall is key for retention.",
      priority: 65,
      action: 'Complete today\'s planner tasks',
    };
  }

  return null;
}

// ─── Main builder ─────────────────────────────────────────────

const MAX_INSIGHTS = 4;

export function buildCoachInsights(input: CoachInsightInput): CoachInsight[] {
  const chapters = classify(input);

  if (chapters.length === 0) return [];

  const moduleId = input.moduleId;

  // Generate one insight per type
  const candidates: CoachInsight[] = [
    priorityInsight(chapters, moduleId),
    misallocationInsight(chapters, moduleId),
    trendInsight(chapters, moduleId),
    confidenceInsight(chapters, moduleId),
    timeBalanceInsight(input.metrics),
    strengthInsight(chapters),
  ].filter((i): i is CoachInsight => i !== null);

  // Deduplicate by chapterId (keep highest priority mention)
  const seen = new Set<string>();
  const deduped: CoachInsight[] = [];
  for (const insight of candidates.sort((a, b) => b.priority - a.priority)) {
    if (insight.chapterId && seen.has(insight.chapterId)) continue;
    if (insight.chapterId) seen.add(insight.chapterId);
    deduped.push(insight);
  }

  // Return top insights sorted by priority
  return deduped.slice(0, MAX_INSIGHTS);
}
