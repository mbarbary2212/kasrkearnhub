import {
  classifyChapterState,
  getPerformanceTrend,
  type ChapterState,
  type PerformanceTrend,
} from './classifyChapterState';
import { classifyLearningPattern, type LearningPattern } from './classifyLearningPattern';
import { getRevisionState, getReviewType, type RevisionState } from './reviewScheduling';
import { generateConfidenceInsight } from './classifyLearningPattern';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { getExamWeightBoost, type ChapterExamWeight } from '@/hooks/useChapterExamWeights';
import { getStudyMode, type StudyMode } from '@/lib/studyModes';

// ─── Public Types ─────────────────────────────────────────────

export interface PlannedTask {
  type: 'video' | 'read' | 'mcq' | 'flashcard' | 'review' | 'resume';
  moduleId?: string;
  chapterId?: string;
  title: string;
  chapterTitle?: string;
  reason: string;
  estimatedMinutes: number;
  priority: number;
  state?: string;
  isPrimary?: boolean;
  subtab?: string;
  tab?: string;
  trend?: PerformanceTrend;
  learningPattern?: string;
  revisionState?: RevisionState;
  prescribedStudyMode?: StudyMode;
}

export interface AdaptiveStudyPlan {
  primaryTask?: PlannedTask;
  tasks: PlannedTask[];
  totalEstimatedMinutes: number;
  planLabel: string;
  rationale: string;
  confidenceInsight?: string | null;
}

export interface ChapterInfo {
  id: string;
  title: string;
  moduleId: string;
  moduleName: string;
  hasLectures: boolean;
  firstLectureTitle?: string;
}

export interface AdaptivePlanInput {
  metrics: StudentChapterMetric[];
  chapters: ChapterInfo[];
  availableMinutes?: number;  // null = default 45-60 min
  examWeightMap?: Map<string, ChapterExamWeight>;
}

// ─── Task Buckets ─────────────────────────────────────────────

type Bucket = 'resume' | 'learn' | 'repair' | 'retain';

interface BucketedTask extends PlannedTask {
  bucket: Bucket;
}

// ─── Plan Labels ──────────────────────────────────────────────

function derivePlanLabel(tasks: BucketedTask[]): string {
  const buckets = new Set(tasks.map(t => t.bucket));
  const repairCount = tasks.filter(t => t.bucket === 'repair').length;
  const retainCount = tasks.filter(t => t.bucket === 'retain').length;
  const learnCount = tasks.filter(t => t.bucket === 'learn').length;

  if (repairCount >= 2) return 'Recovery plan';
  if (retainCount >= 2) return 'Revision-focused plan';
  if (learnCount >= 2) return 'New topic plan';
  if (buckets.has('repair') && buckets.has('retain')) return 'Reinforcement plan';
  return 'Mixed momentum plan';
}

function deriveRationale(tasks: BucketedTask[], planLabel: string): string {
  const buckets = new Set(tasks.map(t => t.bucket));

  if (planLabel === 'Recovery plan') {
    return 'Today focuses on weak areas that need attention.';
  }
  if (planLabel === 'Revision-focused plan') {
    return 'Several topics are due for review to maintain retention.';
  }
  if (planLabel === 'New topic plan') {
    return 'You are starting new topics while maintaining progress.';
  }
  if (planLabel === 'Reinforcement plan') {
    return 'Recent performance needs reinforcement alongside revision.';
  }
  if (buckets.has('repair')) {
    return 'Today balances weak area practice with continued learning.';
  }
  return 'A balanced day of learning and revision.';
}

// ─── Determine max tasks from available time ──────────────────

function getMaxTasks(availableMinutes: number | undefined): number {
  const mins = availableMinutes ?? 50;
  if (mins <= 15) return 1;
  if (mins <= 30) return 2;
  if (mins <= 60) return 3;
  return 3; // cap at 3 visible
}

// ─── Main Builder ─────────────────────────────────────────────

export function buildAdaptiveStudyPlan(input: AdaptivePlanInput): AdaptiveStudyPlan {
  const { metrics, chapters, availableMinutes, examWeightMap } = input;
  const maxTasks = getMaxTasks(availableMinutes);
  const metricsMap = new Map(metrics.map(m => [m.chapter_id, m]));

  // Collect all candidate tasks into buckets
  const candidates: BucketedTask[] = [];

  for (const chapter of chapters) {
    const m = metricsMap.get(chapter.id);
    const state: ChapterState = m ? classifyChapterState(m) : 'not_started';
    const trend: PerformanceTrend = m ? getPerformanceTrend(m) : 'stable';
    const patternResult = m ? classifyLearningPattern(m) : null;
    const patternLabel = patternResult?.pattern;
    const revState: RevisionState = m ? getRevisionState(m) : 'none';

    // ── Retain bucket: overdue/due revision ──
    if (m && (revState === 'overdue' || revState === 'due')) {
      const reviewType = getReviewType(state, patternLabel);
      const isOverdue = revState === 'overdue';
      const weakBoost = state === 'weak' ? 10 : 0;

      let reason = isOverdue ? 'Overdue revision' : 'Due today';
      if (patternResult?.pattern === 'misconception') {
        reason = isOverdue ? 'Overdue — confident mistakes' : 'Review this concept carefully';
      }
      if (state === 'strong') reason = 'Quick refresh';

      let subtab: string | undefined;
      let mins = 15;
      if (reviewType === 'flashcard') { subtab = 'flashcards'; mins = 10; }
      else if (reviewType === 'mcq') { subtab = 'mcqs'; mins = 15; }
      else if (reviewType === 'video') { subtab = 'lectures'; mins = 20; }
      if (state === 'strong') mins = 5;

      candidates.push({
        bucket: 'retain',
        type: reviewType === 'flashcard' ? 'flashcard' : reviewType === 'video' ? 'video' : 'review',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: mins,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab,
        priority: (isOverdue ? 95 : 85) + weakBoost + (trend === 'declining' ? 15 : 0),
        state,
        trend,
        learningPattern: patternLabel,
        revisionState: revState,
      });
    }

    // ── Retain bucket: FSRS flashcards due ──
    if (m && (m.flashcards_overdue > 0 || m.flashcards_due > 0) && revState !== 'overdue' && revState !== 'due') {
      candidates.push({
        bucket: 'retain',
        type: 'flashcard',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason: m.flashcards_overdue > 0 ? 'Overdue revision' : 'Due today',
        estimatedMinutes: 10,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        priority: (m.flashcards_overdue > 0 ? 93 : 83),
        state,
        trend,
        learningPattern: patternLabel,
      });
    }

    // ── Learn bucket: not started / early ──
    if (state === 'not_started' || state === 'early') {
      if (chapter.hasLectures) {
        candidates.push({
          bucket: 'learn',
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
      candidates.push({
        bucket: 'learn',
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
      continue;
    }

    if (state === 'strong') continue;

    // ── Repair bucket: weak / misconception / unstable ──
    if (state === 'weak' || state === 'unstable') {
      let reason = state === 'weak' ? 'Low recent accuracy' : 'Needs reinforcement';
      if (patternResult?.pattern === 'misconception') reason = 'Confident mistakes detected';
      else if (patternResult?.pattern === 'hesitant') reason = 'You know this, but hesitate';
      else if (trend === 'declining') reason = 'Performance dropping';
      else if (trend === 'improving') reason = 'Keep momentum';

      const pBoost = patternResult?.pattern === 'misconception' ? 20
        : patternResult?.pattern === 'hesitant' ? 10 : 0;

      candidates.push({
        bucket: 'repair',
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: (state === 'weak' ? 90 : 75) + (trend === 'declining' ? 15 : 0) + pBoost,
        state,
        trend,
        learningPattern: patternLabel,
      });

      // For misconception weak topics, also suggest review video
      if (chapter.hasLectures && patternResult?.pattern === 'misconception') {
        candidates.push({
          bucket: 'repair',
          type: 'video',
          title: chapter.firstLectureTitle || chapter.title,
          chapterTitle: chapter.title,
          reason: 'Review this concept carefully',
          estimatedMinutes: 20,
          moduleId: chapter.moduleId,
          chapterId: chapter.id,
          subtab: 'lectures',
          priority: 65 + pBoost,
          state,
          trend,
          learningPattern: patternLabel,
        });
      }
      continue;
    }

    // ── In progress → repair-light ──
    {
      let reason = 'Continue where you left';
      if (patternResult?.pattern === 'hesitant') reason = 'Build confidence with quick practice';
      else if (trend === 'declining') reason = 'Performance dropping';
      else if (trend === 'improving') reason = 'Keep momentum';

      candidates.push({
        bucket: 'repair',
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        reason,
        estimatedMinutes: 15,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        subtab: 'mcqs',
        priority: 65 + (trend === 'declining' ? 15 : trend === 'improving' ? 5 : 0),
        state,
        trend,
        learningPattern: patternLabel,
      });
    }
  }

  // ── Apply exam weight boost + engagement factor to all candidates ──
  for (const c of candidates) {
    const examBoost = getExamWeightBoost(c.chapterId || '', examWeightMap);
    const m = c.chapterId ? metricsMap.get(c.chapterId) : undefined;
    const engagementFactor = (m && (m.mcq_attempts ?? 0) < 3) ? 1.15 : 1.0;
    c.priority = c.priority * examBoost * engagementFactor;

    // Attach prescribed study mode from exam weights
    if (c.chapterId && examWeightMap) {
      const w = examWeightMap.get(c.chapterId);
      if (w) {
        c.prescribedStudyMode = w.prescribed_study_mode;
        c.tab = w.prescribed_study_mode.tab;
      }
    }
  }

  // ── Sort all candidates by priority ──
  candidates.sort((a, b) => b.priority - a.priority);

  // ── Assemble balanced plan ──
  const plan: BucketedTask[] = [];
  const usedChapters = new Set<string>();
  const usedBuckets = new Set<Bucket>();
  let misconceptionCount = 0;

  // Pass 1: Pick primary (highest priority)
  if (candidates.length > 0) {
    const primary = candidates[0];
    plan.push({ ...primary, isPrimary: true });
    usedChapters.add(primary.chapterId || '');
    usedBuckets.add(primary.bucket);
    if (primary.learningPattern === 'misconception') misconceptionCount++;
  }

  // Pass 2: Pick complementary from different bucket if possible
  for (const c of candidates) {
    if (plan.length >= maxTasks) break;
    if (usedChapters.has(c.chapterId || '')) continue;
    // Prefer a different bucket for balance
    if (usedBuckets.has(c.bucket) && candidates.some(x => !usedBuckets.has(x.bucket) && !usedChapters.has(x.chapterId || ''))) continue;
    if (c.learningPattern === 'misconception' && misconceptionCount >= 1) continue;

    plan.push(c);
    usedChapters.add(c.chapterId || '');
    usedBuckets.add(c.bucket);
    if (c.learningPattern === 'misconception') misconceptionCount++;
  }

  // Pass 3: Fill remaining slots (allow same bucket)
  for (const c of candidates) {
    if (plan.length >= maxTasks) break;
    if (usedChapters.has(c.chapterId || '')) continue;
    if (c.learningPattern === 'misconception' && misconceptionCount >= 1) continue;

    plan.push(c);
    usedChapters.add(c.chapterId || '');
    if (c.learningPattern === 'misconception') misconceptionCount++;
  }

  // Pass 4: Ensure at least one retention task if any exist
  const hasRetainTask = plan.some(t => t.bucket === 'retain');
  if (!hasRetainTask && plan.length >= maxTasks) {
    const retainCandidate = candidates.find(c => c.bucket === 'retain' && !usedChapters.has(c.chapterId || ''));
    if (retainCandidate) {
      // Replace lowest-priority non-primary task
      const replaceIdx = plan.length > 1 ? plan.length - 1 : -1;
      if (replaceIdx > 0) {
        plan[replaceIdx] = retainCandidate;
      }
    }
  }

  // ── Derive plan metadata ──
  const planLabel = derivePlanLabel(plan);
  const rationale = deriveRationale(plan, planLabel);
  const totalEstimatedMinutes = plan.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  // ── Confidence insight ──
  const chapterTitleMap = new Map(chapters.map(ch => [ch.id, ch.title]));
  const confidenceInsight = generateConfidenceInsight(metrics, chapterTitleMap);

  // ── Convert to PlannedTask[] (strip bucket) ──
  const tasks: PlannedTask[] = plan.map(({ bucket: _, ...rest }) => rest);
  const primaryTask = tasks.find(t => t.isPrimary);

  return {
    primaryTask,
    tasks,
    totalEstimatedMinutes,
    planLabel,
    rationale,
    confidenceInsight,
  };
}
