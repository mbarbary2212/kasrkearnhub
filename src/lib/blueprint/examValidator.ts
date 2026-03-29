/**
 * Post-Generation Exam Validator
 *
 * Validates a generated exam against blueprint rules and attempts
 * auto-repair when violations are found. Also produces structured
 * debug output for inspection.
 */

import type { GeneratedQuestion } from './examGenerator';
import type { GenerationContext } from './generationContext';

// ── Types ──

export type ViolationSeverity = 'error' | 'warning';

export interface Violation {
  rule: string;
  severity: ViolationSeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
  repaired: boolean;
  repairedQuestions?: GeneratedQuestion[];
}

export interface ExamDebugReport {
  timestamp: string;
  assessmentId: string;
  totalQuestions: number;
  componentBreakdown: Record<string, {
    requested: number;
    selected: number;
    shortfall: number;
  }>;
  difficultyBreakdown: {
    target: { easy: number; moderate: number; difficult: number };
    actual: { easy: number; moderate: number; difficult: number; unknown: number };
    deviations: { easy: number; moderate: number; difficult: number };
    withinTolerance: boolean;
  };
  chapterCoverage: {
    eligibleCount: number;
    usedCount: number;
    usedChapterIds: string[];
  };
  ruleChecks: {
    noRecallCaseOverlap: { checked: boolean; passed: boolean; overlappingChapters: string[] };
    noMcqTopicRepeat: { checked: boolean; passed: boolean; duplicateTopics: string[] };
    allFromEligible: { checked: boolean; passed: boolean; ineligibleQuestions: string[] };
  };
  violations: Violation[];
  warnings: string[];
}

// ── Difficulty tolerance (±10 percentage points) ──
const DIFFICULTY_TOLERANCE_PCT = 10;

// ── Validator ──

export function validateGeneratedExam(
  questions: GeneratedQuestion[],
  ctx: GenerationContext,
): ValidationResult {
  const violations: Violation[] = [];

  // 1. No chapter overlap between Recall and Case
  if (ctx.rules.noChapterRecallAndCase) {
    const recallChapters = new Set(
      questions.filter(q => q.componentType === 'short_answer_recall' && q.chapterId)
        .map(q => q.chapterId!)
    );
    const caseChapters = new Set(
      questions.filter(q => q.componentType === 'short_answer_case' && q.chapterId)
        .map(q => q.chapterId!)
    );
    const overlap = [...recallChapters].filter(c => caseChapters.has(c));
    if (overlap.length > 0) {
      violations.push({
        rule: 'no_recall_case_chapter_overlap',
        severity: 'error',
        message: `${overlap.length} chapter(s) appear in both Recall and Case components`,
        details: { overlappingChapters: overlap },
      });
    }
  }

  // 2. No topic repeat in MCQ
  if (ctx.rules.noMcqTopicRepeat) {
    const mcqTopics = questions
      .filter(q => q.componentType === 'mcq' && q.topicId)
      .map(q => q.topicId!);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const t of mcqTopics) {
      if (seen.has(t)) duplicates.add(t);
      seen.add(t);
    }
    if (duplicates.size > 0) {
      violations.push({
        rule: 'no_mcq_topic_repeat',
        severity: 'warning',
        message: `${duplicates.size} topic(s) repeated in MCQ component`,
        details: { duplicateTopics: [...duplicates] },
      });
    }
  }

  // 3. Difficulty distribution approximately respected
  const totalWithDifficulty = questions.filter(q => q.difficulty).length;
  if (totalWithDifficulty > 0) {
    const counts = { easy: 0, moderate: 0, difficult: 0 };
    for (const q of questions) {
      if (q.difficulty && q.difficulty in counts) {
        counts[q.difficulty as keyof typeof counts]++;
      }
    }
    const target = ctx.rules.difficultyDistribution;
    for (const tier of ['easy', 'moderate', 'difficult'] as const) {
      const actualPct = (counts[tier] / totalWithDifficulty) * 100;
      const deviation = Math.abs(actualPct - target[tier]);
      if (deviation > DIFFICULTY_TOLERANCE_PCT) {
        violations.push({
          rule: 'difficulty_distribution',
          severity: 'warning',
          message: `${tier}: ${actualPct.toFixed(1)}% actual vs ${target[tier]}% target (deviation ${deviation.toFixed(1)}% exceeds ±${DIFFICULTY_TOLERANCE_PCT}% tolerance)`,
          details: { tier, actualPct, targetPct: target[tier], deviation },
        });
      }
    }
  }

  // 4. All questions from eligible chapters
  const eligibleChapterSet = new Set(ctx.eligibleChapters.map(c => c.chapterId));
  const ineligible = questions.filter(
    q => q.chapterId && !eligibleChapterSet.has(q.chapterId)
  );
  if (ineligible.length > 0) {
    violations.push({
      rule: 'all_from_eligible_chapters',
      severity: 'error',
      message: `${ineligible.length} question(s) from ineligible chapters`,
      details: { questionIds: ineligible.map(q => q.questionId), chapterIds: [...new Set(ineligible.map(q => q.chapterId!))] },
    });
  }

  const hasErrors = violations.some(v => v.severity === 'error');

  return {
    valid: !hasErrors,
    violations,
    repaired: false,
  };
}

// ── Auto-repair ──

/**
 * Attempts to fix violations by removing offending questions.
 * Returns repaired question list + updated validation.
 */
export function repairExam(
  questions: GeneratedQuestion[],
  ctx: GenerationContext,
): { questions: GeneratedQuestion[]; validation: ValidationResult } {
  let repaired = [...questions];
  let changed = false;

  // Fix 1: Remove ineligible chapter questions
  const eligibleChapterSet = new Set(ctx.eligibleChapters.map(c => c.chapterId));
  const beforeIneligible = repaired.length;
  repaired = repaired.filter(q => !q.chapterId || eligibleChapterSet.has(q.chapterId));
  if (repaired.length < beforeIneligible) changed = true;

  // Fix 2: Remove chapter overlap between Recall and Case
  if (ctx.rules.noChapterRecallAndCase) {
    const recallChapters = new Set(
      repaired.filter(q => q.componentType === 'short_answer_recall' && q.chapterId)
        .map(q => q.chapterId!)
    );
    // Remove Case questions whose chapter is already used by Recall
    const beforeOverlap = repaired.length;
    repaired = repaired.filter(q => {
      if (q.componentType !== 'short_answer_case') return true;
      if (!q.chapterId) return true;
      return !recallChapters.has(q.chapterId);
    });
    if (repaired.length < beforeOverlap) changed = true;
  }

  // Fix 3: Remove duplicate-topic MCQs (keep first occurrence)
  if (ctx.rules.noMcqTopicRepeat) {
    const seenTopics = new Set<string>();
    const beforeDedup = repaired.length;
    repaired = repaired.filter(q => {
      if (q.componentType !== 'mcq') return true;
      if (!q.topicId) return true;
      if (seenTopics.has(q.topicId)) return false;
      seenTopics.add(q.topicId);
      return true;
    });
    if (repaired.length < beforeDedup) changed = true;
  }

  // Re-number display order
  repaired = repaired.map((q, idx) => ({ ...q, displayOrder: idx + 1 }));

  // Re-validate
  const validation = validateGeneratedExam(repaired, ctx);
  validation.repaired = changed;
  if (changed) {
    validation.repairedQuestions = repaired;
  }

  return { questions: repaired, validation };
}

// ── Debug report ──

export function buildDebugReport(
  assessmentId: string,
  questions: GeneratedQuestion[],
  ctx: GenerationContext,
  generationWarnings: string[],
): ExamDebugReport {
  // Component breakdown
  const componentBreakdown: ExamDebugReport['componentBreakdown'] = {};
  for (const comp of ctx.components) {
    const selected = questions.filter(q => q.componentType === comp.componentType).length;
    componentBreakdown[comp.componentType] = {
      requested: comp.questionCount,
      selected,
      shortfall: Math.max(0, comp.questionCount - selected),
    };
  }

  // Difficulty breakdown
  const diffCounts = { easy: 0, moderate: 0, difficult: 0, unknown: 0 };
  for (const q of questions) {
    const d = q.difficulty as keyof typeof diffCounts || 'unknown';
    if (d in diffCounts) diffCounts[d]++;
    else diffCounts.unknown++;
  }
  const totalWithDiff = diffCounts.easy + diffCounts.moderate + diffCounts.difficult;
  const target = ctx.rules.difficultyDistribution;
  const actualPct = totalWithDiff > 0
    ? { easy: (diffCounts.easy / totalWithDiff) * 100, moderate: (diffCounts.moderate / totalWithDiff) * 100, difficult: (diffCounts.difficult / totalWithDiff) * 100 }
    : { easy: 0, moderate: 0, difficult: 0 };
  const deviations = {
    easy: Math.abs(actualPct.easy - target.easy),
    moderate: Math.abs(actualPct.moderate - target.moderate),
    difficult: Math.abs(actualPct.difficult - target.difficult),
  };

  // Chapter coverage
  const usedChapterIds = [...new Set(questions.filter(q => q.chapterId).map(q => q.chapterId!))];

  // Rule checks
  const eligibleChapterSet = new Set(ctx.eligibleChapters.map(c => c.chapterId));

  const recallChapters = new Set(questions.filter(q => q.componentType === 'short_answer_recall' && q.chapterId).map(q => q.chapterId!));
  const caseChapters = new Set(questions.filter(q => q.componentType === 'short_answer_case' && q.chapterId).map(q => q.chapterId!));
  const overlappingChapters = [...recallChapters].filter(c => caseChapters.has(c));

  const mcqTopics = questions.filter(q => q.componentType === 'mcq' && q.topicId).map(q => q.topicId!);
  const seenTopics = new Set<string>();
  const duplicateTopics: string[] = [];
  for (const t of mcqTopics) {
    if (seenTopics.has(t)) { if (!duplicateTopics.includes(t)) duplicateTopics.push(t); }
    seenTopics.add(t);
  }

  const ineligibleQuestions = questions.filter(q => q.chapterId && !eligibleChapterSet.has(q.chapterId)).map(q => q.questionId);

  // Validation
  const validation = validateGeneratedExam(questions, ctx);

  return {
    timestamp: new Date().toISOString(),
    assessmentId,
    totalQuestions: questions.length,
    componentBreakdown,
    difficultyBreakdown: {
      target,
      actual: diffCounts,
      deviations,
      withinTolerance: Object.values(deviations).every(d => d <= DIFFICULTY_TOLERANCE_PCT),
    },
    chapterCoverage: {
      eligibleCount: ctx.eligibleChapters.length,
      usedCount: usedChapterIds.length,
      usedChapterIds,
    },
    ruleChecks: {
      noRecallCaseOverlap: {
        checked: ctx.rules.noChapterRecallAndCase,
        passed: overlappingChapters.length === 0,
        overlappingChapters,
      },
      noMcqTopicRepeat: {
        checked: ctx.rules.noMcqTopicRepeat,
        passed: duplicateTopics.length === 0,
        duplicateTopics,
      },
      allFromEligible: {
        checked: true,
        passed: ineligibleQuestions.length === 0,
        ineligibleQuestions,
      },
    },
    violations: validation.violations,
    warnings: generationWarnings,
  };
}
