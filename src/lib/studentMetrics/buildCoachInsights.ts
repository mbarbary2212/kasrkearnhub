import {
  classifyChapterState,
  getPerformanceTrend,
  type ChapterState,
  type PerformanceTrend,
} from './classifyChapterState';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { getExamWeightBoost, type ChapterExamWeight } from '@/hooks/useChapterExamWeights';

// ─── Types ────────────────────────────────────────────────────

export interface CoachInsight {
  type: 'priority' | 'misallocation' | 'trend' | 'strength' | 'confidence';
  message: string;
  /** Higher = more important, show first */
  priority: number;
  chapterId?: string;
}

interface CoachInsightInput {
  metrics: StudentChapterMetric[];
  chapterTitleMap: Map<string, string>;
  examWeightMap?: Map<string, ChapterExamWeight>;
}

// ─── Helpers ──────────────────────────────────────────────────

interface ClassifiedChapter {
  id: string;
  title: string;
  state: ChapterState;
  trend: PerformanceTrend;
  metric: StudentChapterMetric;
  examBoost: number;
  isHighYield: boolean;
}

function classify(input: CoachInsightInput): ClassifiedChapter[] {
  return input.metrics
    .filter(m => m.mcq_attempts >= 1) // need some data
    .map(m => {
      const state = classifyChapterState(m);
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

// ─── Insight generators (each returns 0-1 insight) ────────────

function priorityInsight(chapters: ClassifiedChapter[]): CoachInsight | null {
  // Weak + high-yield = top priority
  const weakHighYield = chapters
    .filter(c => c.state === 'weak' && c.isHighYield)
    .sort((a, b) => b.examBoost - a.examBoost);

  if (weakHighYield.length > 0) {
    const ch = weakHighYield[0];
    return {
      type: 'priority',
      message: `${ch.title} is a high-yield chapter where you're struggling. Focus here first.`,
      priority: 100,
      chapterId: ch.id,
    };
  }

  // Weak but not high-yield
  const weak = chapters
    .filter(c => c.state === 'weak')
    .sort((a, b) => a.metric.recent_mcq_accuracy - b.metric.recent_mcq_accuracy);

  if (weak.length > 0) {
    const ch = weak[0];
    return {
      type: 'priority',
      message: `${ch.title} needs attention — your recent accuracy is ${Math.round(ch.metric.recent_mcq_accuracy)}%.`,
      priority: 85,
      chapterId: ch.id,
    };
  }

  return null;
}

function misallocationInsight(chapters: ClassifiedChapter[]): CoachInsight | null {
  // Find high-yield chapters that are weak or unstable with low attempts
  const neglectedHighYield = chapters.filter(
    c => c.isHighYield && (c.state === 'weak' || c.state === 'unstable' || c.state === 'early') && c.metric.mcq_attempts < 10
  );

  // Find low-yield chapters with many attempts
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
    };
  }

  return null;
}

function trendInsight(chapters: ClassifiedChapter[]): CoachInsight | null {
  // Declining chapters that aren't already weak (weak is covered by priority)
  const declining = chapters
    .filter(c => c.trend === 'declining' && c.state !== 'weak' && c.metric.mcq_attempts >= 5)
    .sort((a, b) => b.examBoost - a.examBoost);

  if (declining.length > 0) {
    const ch = declining[0];
    return {
      type: 'trend',
      message: `Your performance in ${ch.title} is declining — revise before it worsens.`,
      priority: 75,
      chapterId: ch.id,
    };
  }

  // Improving chapters (positive reinforcement)
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
    };
  }

  const ch = strong[0];
  return {
    type: 'strength',
    message: `${ch.title} is a strength — maintain with light review.`,
    priority: 30,
    chapterId: ch.id,
  };
}

function confidenceInsight(chapters: ClassifiedChapter[]): CoachInsight | null {
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
    };
  }

  return null;
}

// ─── Main builder ─────────────────────────────────────────────

const MAX_INSIGHTS = 4;

export function buildCoachInsights(input: CoachInsightInput): CoachInsight[] {
  const chapters = classify(input);

  if (chapters.length === 0) return [];

  // Generate one insight per type
  const candidates: CoachInsight[] = [
    priorityInsight(chapters),
    misallocationInsight(chapters),
    trendInsight(chapters),
    confidenceInsight(chapters),
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
