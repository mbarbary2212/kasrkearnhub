import {
  getPerformanceTrend,
  type PerformanceTrend,
} from './classifyChapterState';
import { classifyFromMetrics, type ChapterStatus } from '@/lib/readiness';
import { classifyLearningPattern, type LearningPattern } from './classifyLearningPattern';
import { getRevisionState, getReviewType, type RevisionState } from './reviewScheduling';
import { generateConfidenceInsight } from './classifyLearningPattern';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { getExamWeightBoost, type ChapterExamWeight } from '@/hooks/useChapterExamWeights';
import { getStudyMode, type StudyMode } from '@/lib/studyModes';
import {
  getPrimaryMode,
  getModeConfigForState,
  type LearningMode,
  type ModeConfig,
} from '@/lib/learningModes';
import {
  PRIORITY_CAP,
  MIN_PROGRESS_TASKS_UNLESS_EXAM_CRITICAL,
  EXAM_CRITICAL_DAYS,
  EXAM_MODE_MULTIPLIERS,
  classifyExamMode,
  getDaysUntilExam,
  type ExamMode,
} from './plannerThresholds';

// ─── Study mode task details ──────────────────────────────────

interface StudyModeTaskConfig {
  detail: string;
  estimatedMinutes: number;
}

const STUDY_MODE_TASK_CONFIG: Record<string, StudyModeTaskConfig> = {
  mcq_practice:      { detail: '10–20 questions',    estimatedMinutes: 15 },
  recall_practice:   { detail: 'structured recall',  estimatedMinutes: 15 },
  case_scenarios:    { detail: '1–2 clinical cases',  estimatedMinutes: 20 },
  case_practice:     { detail: 'focused clinical cases', estimatedMinutes: 20 },
  clinical_practice: { detail: 'OSCE / case walkthrough', estimatedMinutes: 25 },
  visual_practice:   { detail: 'images & pathology',  estimatedMinutes: 15 },
  review:            { detail: 'flashcards',           estimatedMinutes: 10 },
};

function getTaskConfig(mode: StudyMode): StudyModeTaskConfig {
  return STUDY_MODE_TASK_CONFIG[mode.key] ?? STUDY_MODE_TASK_CONFIG.review;
}

// ─── Mode-aware task config ──────────────────────────────────

function getModeAwareTaskConfig(status: ChapterStatus): { modeConfig: ModeConfig; primaryMode: LearningMode } {
  const primaryMode = getPrimaryMode(status);
  const modeConfig = getModeConfigForState(status);
  return { modeConfig, primaryMode };
}

// ─── Public Types ─────────────────────────────────────────────

export type TaskStudyModeKey = 'mcq_practice' | 'recall_practice' | 'case_scenarios' | 'case_practice' | 'clinical_practice' | 'visual_practice' | 'review';

export interface PlannedTask {
  /** @deprecated Use prescribedStudyMode.key instead */
  type: string;
  moduleId?: string;
  chapterId?: string;
  title: string;
  chapterTitle?: string;
  reason: string;
  detail?: string;
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
  /** Phase 2.5: Learning mode assigned based on chapter state */
  learningMode?: LearningMode;
}

export interface AdaptiveStudyPlan {
  primaryTask?: PlannedTask;
  tasks: PlannedTask[];
  totalEstimatedMinutes: number;
  planLabel: string;
  rationale: string;
  confidenceInsight?: string | null;
  examMode?: ExamMode;
  daysUntilExam?: number | null;
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
  availableMinutes?: number;
  examWeightMap?: Map<string, ChapterExamWeight>;
  /** Exam date from study_plans configuration */
  examDate?: Date;
  /** Optional reasoning profile for case practice tasks */
  reasoningProfile?: { domain: string; label: string; avgPercentage: number; attemptCount: number; criticalMissRate: number; trend: string }[];
}

// ─── Slot types for balanced daily plan ───────────────────────

type Slot = 'review_due' | 'weakness' | 'progress';

interface SlottedTask extends PlannedTask {
  slot: Slot;
}

// ─── Plan Labels ──────────────────────────────────────────────

function derivePlanLabel(tasks: SlottedTask[], examMode: ExamMode, daysUntilExam: number | null): string {
  // Exam mode label takes precedence
  if (examMode === 'intensive' && daysUntilExam !== null) {
    return `Exam prep — ${daysUntilExam} day${daysUntilExam !== 1 ? 's' : ''} left`;
  }
  if (examMode === 'moderate' && daysUntilExam !== null) {
    return `Exam focus — ${daysUntilExam} days left`;
  }

  const weakCount = tasks.filter(t => t.slot === 'weakness').length;
  const reviewCount = tasks.filter(t => t.slot === 'review_due').length;
  const progressCount = tasks.filter(t => t.slot === 'progress').length;

  if (weakCount >= 2) return 'Recovery plan';
  if (reviewCount >= 2) return 'Revision-focused plan';
  if (progressCount >= 2) return 'New topic plan';
  if (tasks.some(t => t.slot === 'weakness') && tasks.some(t => t.slot === 'review_due')) return 'Reinforcement plan';
  return 'Mixed momentum plan';
}

function deriveRationale(tasks: SlottedTask[], planLabel: string, examMode: ExamMode): string {
  if (examMode === 'intensive') return 'Exam is imminent — focusing on weak spots and high-weight chapters.';
  if (examMode === 'moderate') return 'Exam approaching — prioritising revision and weak areas.';
  if (planLabel === 'Recovery plan') return 'Today focuses on weak areas that need attention.';
  if (planLabel === 'Revision-focused plan') return 'Several topics are due for review to maintain retention.';
  if (planLabel === 'New topic plan') return 'You are starting new topics while maintaining progress.';
  if (planLabel === 'Reinforcement plan') return 'Recent performance needs reinforcement alongside revision.';
  return 'A balanced day of learning and revision.';
}

// ─── Resolve study mode for a chapter ─────────────────────────

function resolveStudyMode(
  chapterId: string,
  examWeightMap?: Map<string, ChapterExamWeight>,
): StudyMode {
  if (!examWeightMap) return getStudyMode(null); // fallback → Review
  const w = examWeightMap.get(chapterId);
  return w ? w.prescribed_study_mode : getStudyMode(null);
}

// ─── Max tasks ────────────────────────────────────────────────

function getMaxTasks(availableMinutes: number | undefined): number {
  const mins = availableMinutes ?? 50;
  if (mins <= 15) return 1;
  if (mins <= 30) return 2;
  if (mins <= 60) return 3;
  return 4; // allow up to 4 for longer sessions
}

// ─── Main Builder ─────────────────────────────────────────────

// ─── Status-based priority multiplier ─────────────────────
const STATUS_PRIORITY: Record<string, number> = {
  needs_attention: 10,
  not_started: 8,
  started: 6,
  building: 4,
  ready: 2,
  strong: 1,
};

export function buildAdaptiveStudyPlan(input: AdaptivePlanInput): AdaptiveStudyPlan {
  const { metrics, chapters, availableMinutes, examWeightMap, examDate } = input;

  // FIX D — fallback when no chapter data
  if (!chapters || chapters.length === 0) {
    return {
      tasks: [],
      totalEstimatedMinutes: 0,
      planLabel: 'No data',
      rationale: 'No chapter data available to build a study plan.',
    };
  }

  const maxTasks = getMaxTasks(availableMinutes);
  const metricsMap = new Map(metrics.map(m => [m.chapter_id, m]));

  // ── Exam mode ──
  const daysUntilExam = getDaysUntilExam(examDate ?? null);
  const examMode = classifyExamMode(daysUntilExam);
  const multipliers = EXAM_MODE_MULTIPLIERS[examMode];

  // FIX C — detect if any non-strong chapters exist
  const hasNonStrongChapters = chapters.some(ch => {
    const m = metricsMap.get(ch.id);
    const s: ChapterStatus = m ? classifyFromMetrics(m) : 'not_started';
    return s !== 'strong';
  });

  // Collect candidates into slots
  const candidates: SlottedTask[] = [];

  for (const chapter of chapters) {
    const m = metricsMap.get(chapter.id);
    const state: ChapterStatus = m ? classifyFromMetrics(m) : 'not_started';
    const trend: PerformanceTrend = m ? getPerformanceTrend(m) : 'stable';
    const patternResult = m ? classifyLearningPattern(m) : null;
    const patternLabel = patternResult?.pattern;
    const revState: RevisionState = m ? getRevisionState(m) : 'none';

    // Resolve prescribed study mode from blueprint
    const studyMode = resolveStudyMode(chapter.id, examWeightMap);
    const taskConfig = getTaskConfig(studyMode);

    // ── review_due slot: overdue/due revision or flashcards ──
    if (m && (revState === 'overdue' || revState === 'due')) {
      const isOverdue = revState === 'overdue';
      const weakBoost = state === 'needs_attention' ? 10 : 0;

      let reason = isOverdue ? 'Overdue revision' : 'Due today';
      if (patternResult?.pattern === 'misconception') {
        reason = isOverdue ? 'Overdue — confident mistakes' : 'Review this concept carefully';
      }
      if (state === 'strong') reason = 'Quick refresh';

      const mins = state === 'strong' ? 5 : taskConfig.estimatedMinutes;
      const basePriority = (isOverdue ? 95 : 85) + weakBoost + (trend === 'declining' ? 15 : 0);

      candidates.push({
        slot: 'review_due',
        type: studyMode.key,
        title: `${chapter.title} — ${studyMode.label} (${taskConfig.detail})`,
        chapterTitle: chapter.moduleName,
        reason,
        detail: taskConfig.detail,
        estimatedMinutes: mins,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        tab: studyMode.tab,
        priority: basePriority * multipliers.review,
        state,
        trend,
        learningPattern: patternLabel,
        revisionState: revState,
        prescribedStudyMode: studyMode,
      });
    }

    // ── review_due slot: FSRS flashcards due ──
    if (m && (m.flashcards_overdue > 0 || m.flashcards_due > 0) && revState !== 'overdue' && revState !== 'due') {
      const reviewMode = getStudyMode(null);
      candidates.push({
        slot: 'review_due',
        type: 'review',
        title: `${chapter.title} — Review (flashcards)`,
        chapterTitle: chapter.moduleName,
        reason: m.flashcards_overdue > 0 ? 'Overdue revision' : 'Due today',
        detail: 'flashcards',
        estimatedMinutes: 10,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        tab: 'resources',
        priority: (m.flashcards_overdue > 0 ? 93 : 83) * multipliers.review,
        state,
        trend,
        learningPattern: patternLabel,
        prescribedStudyMode: reviewMode,
      });
    }

    // ── progress slot: not started / started ──
    // Phase 2.5: Always assign learning mode for new chapters
    if (state === 'not_started' || state === 'started') {
      const { modeConfig, primaryMode } = getModeAwareTaskConfig(state);
      candidates.push({
        slot: 'progress',
        type: studyMode.key,
        title: `${chapter.title} — ${modeConfig.label} (${modeConfig.taskDetail})`,
        chapterTitle: chapter.moduleName,
        reason: state === 'not_started' ? 'Start with Socrates' : 'Continue learning',
        detail: modeConfig.taskDetail,
        estimatedMinutes: modeConfig.estimatedMinutes,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        tab: modeConfig.section,
        priority: multipliers.progressBasePriority,
        state,
        trend,
        prescribedStudyMode: studyMode,
        learningMode: primaryMode,
      });
      continue;
    }

    // FIX C — skip strong chapters when non-strong ones remain
    // Phase 2.5: strong chapters get assessment mode tasks via review_due slot above
    if (state === 'strong' && hasNonStrongChapters) continue;

    // ── weakness slot: needs_attention / building ──
    // needs_attention → learning mode; building → practice mode
    if (state === 'needs_attention' || state === 'building') {
      const { modeConfig, primaryMode } = getModeAwareTaskConfig(state);

      let reason = state === 'needs_attention' ? 'Review with Socrates first' : 'Needs more practice';
      if (patternResult?.pattern === 'misconception') reason = 'Confident mistakes detected';
      else if (patternResult?.pattern === 'hesitant') reason = 'You know this, but hesitate';
      else if (trend === 'declining') reason = 'Performance dropping';
      else if (trend === 'improving') reason = 'Keep momentum';

      const pBoost = patternResult?.pattern === 'misconception' ? 20
        : patternResult?.pattern === 'hesitant' ? 10 : 0;

      const basePriority = (state === 'needs_attention' ? 90 : 75) + (trend === 'declining' ? 15 : 0) + pBoost;

      candidates.push({
        slot: 'weakness',
        type: studyMode.key,
        title: `${chapter.title} — ${modeConfig.label} (${modeConfig.taskDetail})`,
        chapterTitle: chapter.moduleName,
        reason,
        detail: modeConfig.taskDetail,
        estimatedMinutes: modeConfig.estimatedMinutes,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        tab: modeConfig.section,
        priority: basePriority * multipliers.weakness,
        state,
        trend,
        learningPattern: patternLabel,
        prescribedStudyMode: studyMode,
        learningMode: primaryMode,
      });
      continue;
    }

    // ── weakness slot (light): ready / remaining chapters ──
    // ready → mix of practice + assessment
    {
      const { modeConfig, primaryMode } = getModeAwareTaskConfig(state);
      let reason = 'Continue where you left';
      if (patternResult?.pattern === 'hesitant') reason = 'Build confidence with quick practice';
      else if (trend === 'declining') reason = 'Performance dropping';
      else if (trend === 'improving') reason = 'Keep momentum';

      const basePriority = 65 + (trend === 'declining' ? 15 : trend === 'improving' ? 5 : 0);

      candidates.push({
        slot: 'weakness',
        type: studyMode.key,
        title: `${chapter.title} — ${modeConfig.label} (${modeConfig.taskDetail})`,
        chapterTitle: chapter.moduleName,
        reason,
        detail: modeConfig.taskDetail,
        estimatedMinutes: modeConfig.estimatedMinutes,
        moduleId: chapter.moduleId,
        chapterId: chapter.id,
        tab: modeConfig.section,
        priority: basePriority * multipliers.weakness,
        state,
        trend,
        learningPattern: patternLabel,
        prescribedStudyMode: studyMode,
        learningMode: primaryMode,
      });
    }
  }

  // ── Case practice tasks from reasoning profile weaknesses ──
  if (input.reasoningProfile && input.reasoningProfile.length > 0) {
    const weakDomains = input.reasoningProfile
      .filter(d => (d.avgPercentage < 50 || d.criticalMissRate > 30) && d.attemptCount >= 3)
      .slice(0, 2); // max 2 case practice tasks

    for (const domain of weakDomains) {
      // Find the chapter most relevant to the weak reasoning domain.
      // Strategy: prefer a chapter whose title or module name contains the domain label (case-insensitive).
      // If no title match, fall back to the chapter with the lowest MCQ accuracy in metrics.
      // If metrics are empty, fall back to chapters[0] as a last resort.
      const domainLabel = domain.label?.toLowerCase() ?? '';

      const titleMatch = chapters.find(c =>
        c.title?.toLowerCase().includes(domainLabel) ||
        c.moduleName?.toLowerCase().includes(domainLabel)
      );

      const lowestAccuracyChapter = titleMatch
        ? null
        : [...chapters].sort((a, b) => {
            const mA = input.metrics.find(m => m.chapter_id === a.id);
            const mB = input.metrics.find(m => m.chapter_id === b.id);
            const accA = mA?.mcq_accuracy ?? 100;
            const accB = mB?.mcq_accuracy ?? 100;
            return accA - accB;
          })[0] ?? null;

      const targetChapter = titleMatch ?? lowestAccuracyChapter ?? chapters[0];
      const taskDetail = domain.criticalMissRate > 40
        ? `critical miss recovery — ${domain.label}`
        : `focused ${domain.label} practice`;

      candidates.push({
        slot: 'weakness',
        type: 'case_practice',
        title: `Case Qs — ${domain.label} (${taskDetail})`,
        chapterTitle: targetChapter?.moduleName,
        reason: domain.criticalMissRate > 40
          ? `${domain.criticalMissRate}% critical miss rate in ${domain.label}`
          : `${domain.label} averaging ${domain.avgPercentage}%`,
        detail: taskDetail,
        estimatedMinutes: 20,
        moduleId: targetChapter?.moduleId,
        chapterId: targetChapter?.id,
        tab: 'practice',
        subtab: 'case_scenario',
        priority: domain.criticalMissRate > 40 ? 92 : 82,
        state: 'building',
        trend: domain.trend === 'declining' ? 'declining' : domain.trend === 'improving' ? 'improving' : 'stable',
        prescribedStudyMode: { key: 'case_practice', label: 'Case Practice', tab: 'practice' },
      } as SlottedTask);
    }
  }

  // ── Apply exam weight boost + engagement factor ──
  for (const c of candidates) {
    const examBoost = getExamWeightBoost(c.chapterId || '', examWeightMap);
    const m = c.chapterId ? metricsMap.get(c.chapterId) : undefined;
    const engagementFactor = (m && (m.mcq_attempts ?? 0) < 3) ? 1.15 : 1.0;

    // Cap exam weight boost based on exam mode
    const cappedExamBoost = Math.min(examBoost, multipliers.weightCap);

    // FIX A — apply status-based priority multiplier
    const statusMult = STATUS_PRIORITY[c.state ?? 'not_started'] ?? 6;
    c.priority = Math.min(PRIORITY_CAP, c.priority * cappedExamBoost * engagementFactor * (statusMult / 6));
  }

  // ── Sort strictly by priority ──
  candidates.sort((a, b) => b.priority - a.priority);

  // ── Assemble balanced plan: 1 review_due, 1 weakness, 1 progress ──
  const plan: SlottedTask[] = [];
  const usedChapters = new Set<string>();

  // Pass 1: Fill each slot with highest-priority candidate
  const slotOrder: Slot[] = ['review_due', 'weakness', 'progress'];
  for (const slot of slotOrder) {
    if (plan.length >= maxTasks) break;
    const candidate = candidates.find(
      c => c.slot === slot && !usedChapters.has(c.chapterId || '')
    );
    if (candidate) {
      plan.push(candidate);
      usedChapters.add(candidate.chapterId || '');
    }
  }

  // Pass 2: Fill remaining slots from any candidates by priority
  // FIX B — cap daily session time at 120 minutes
  for (const c of candidates) {
    if (plan.length >= maxTasks) break;
    if (usedChapters.has(c.chapterId || '')) continue;
    const dayMinutes = plan.reduce((sum, s) => sum + (s.estimatedMinutes ?? 30), 0);
    if (dayMinutes >= 120) break;
    plan.push(c);
    usedChapters.add(c.chapterId || '');
  }

  // ── Safety rail: ensure at least 1 progress task unless exam-critical ──
  const hasProgressTask = plan.some(t => t.slot === 'progress');
  if (!hasProgressTask && (daysUntilExam === null || daysUntilExam >= EXAM_CRITICAL_DAYS)) {
    const progressCandidate = candidates.find(
      c => c.slot === 'progress' && !usedChapters.has(c.chapterId || '')
    );
    if (progressCandidate && plan.length > 0) {
      // Replace lowest-priority task if we have room concern
      if (plan.length >= maxTasks) {
        plan[plan.length - 1] = progressCandidate;
      } else {
        plan.push(progressCandidate);
      }
    }
  }

  // Mark highest-priority as primary
  if (plan.length > 0) {
    plan.sort((a, b) => b.priority - a.priority);
    plan[0].isPrimary = true;
  }

  // ── Derive plan metadata ──
  const planLabel = derivePlanLabel(plan, examMode, daysUntilExam);
  const rationale = deriveRationale(plan, planLabel, examMode);
  const totalEstimatedMinutes = plan.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  // ── Confidence insight ──
  const chapterTitleMap = new Map(chapters.map(ch => [ch.id, ch.title]));
  const confidenceInsight = generateConfidenceInsight(metrics, chapterTitleMap);

  // ── Convert to PlannedTask[] (strip slot) ──
  const tasks: PlannedTask[] = plan.map(({ slot: _, ...rest }) => rest);
  const primaryTask = tasks.find(t => t.isPrimary);

  return {
    primaryTask,
    tasks,
    totalEstimatedMinutes,
    planLabel,
    rationale,
    confidenceInsight,
    examMode,
    daysUntilExam,
  };
}
