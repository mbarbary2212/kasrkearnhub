/**
 * Case Scenario Pool Resolver
 *
 * Resolves the available case_scenario pool for a given set of eligible chapters,
 * respecting difficulty distribution and chapter non-repetition rules.
 *
 * Key principle: each CaseScenario is ONE atomic unit in the exam.
 * Sub-questions inside a case are NOT counted individually —
 * the case counts as 1 question toward the component's question_count.
 *
 * ⚠️  This does NOT select final questions — it builds the candidate pool
 *     that the future generator will sample from.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CaseDifficulty } from '@/types/caseScenario';
import type { DifficultyDistribution } from '@/hooks/useAssessmentBlueprint';

// ── Types ──

/** A case unit ready for selection — treated as 1 exam question */
export interface CasePoolEntry {
  caseId: string;
  chapterId: string;
  topicId: string | null;
  difficulty: CaseDifficulty;
  /** Total marks = sum of all sub-question max_marks */
  totalMarks: number;
  /** Number of sub-questions inside this case */
  subQuestionCount: number;
}

export interface CasePoolSummary {
  /** All available cases grouped for selection */
  entries: CasePoolEntry[];
  /** Counts by difficulty */
  byDifficulty: Record<CaseDifficulty, number>;
  /** Counts by chapter */
  byChapter: Record<string, number>;
  /** Total available case units */
  totalCases: number;
}

export interface CasePoolValidation {
  isValid: boolean;
  issues: { severity: 'error' | 'warning'; message: string }[];
}

// ── Resolver ──

/**
 * Fetches and structures the case scenario pool for eligible chapters.
 *
 * Each returned entry is ONE case = ONE exam question.
 * Sub-questions are aggregated into totalMarks/subQuestionCount
 * but the case is selected as a single unit.
 */
export async function resolveCasePool(
  eligibleChapterIds: string[]
): Promise<CasePoolSummary> {
  if (eligibleChapterIds.length === 0) {
    return { entries: [], byDifficulty: { easy: 0, moderate: 0, difficult: 0 }, byChapter: {}, totalCases: 0 };
  }

  const { data, error } = await supabase
    .from('case_scenarios')
    .select(`
      id,
      chapter_id,
      topic_id,
      difficulty,
      case_scenario_questions ( max_marks )
    `)
    .in('chapter_id', eligibleChapterIds)
    .eq('is_deleted', false);

  if (error) throw error;

  const entries: CasePoolEntry[] = (data ?? [])
    .filter((c: any) => c.chapter_id) // must have chapter_id
    .map((c: any) => {
      const questions = c.case_scenario_questions ?? [];
      return {
        caseId: c.id,
        chapterId: c.chapter_id!,
        topicId: c.topic_id,
        difficulty: c.difficulty as CaseDifficulty,
        totalMarks: questions.reduce((sum: number, q: any) => sum + (q.max_marks ?? 1), 0),
        subQuestionCount: questions.length,
      };
    });

  const byDifficulty: Record<CaseDifficulty, number> = { easy: 0, moderate: 0, difficult: 0 };
  const byChapter: Record<string, number> = {};

  for (const e of entries) {
    byDifficulty[e.difficulty]++;
    byChapter[e.chapterId] = (byChapter[e.chapterId] ?? 0) + 1;
  }

  return { entries, byDifficulty, byChapter, totalCases: entries.length };
}

// ── Validation ──

/**
 * Validates whether the case pool can satisfy the blueprint requirements.
 *
 * @param pool - resolved case pool
 * @param requiredCount - number of cases the component needs (from ComponentSpec.questionCount)
 * @param difficultyDist - target difficulty percentages
 * @param usedChapterIds - chapters already used by other components (for non-repetition)
 */
export function validateCasePool(
  pool: CasePoolSummary,
  requiredCount: number,
  difficultyDist: DifficultyDistribution,
  usedChapterIds: Set<string> = new Set()
): CasePoolValidation {
  const issues: CasePoolValidation['issues'] = [];

  // Filter out chapters already used (chapter non-repetition rule)
  const availableEntries = usedChapterIds.size > 0
    ? pool.entries.filter(e => !usedChapterIds.has(e.chapterId))
    : pool.entries;

  const availableCount = availableEntries.length;

  if (availableCount === 0) {
    issues.push({
      severity: 'error',
      message: 'No case scenarios available in eligible chapters.',
    });
    return { isValid: false, issues };
  }

  if (availableCount < requiredCount) {
    issues.push({
      severity: 'error',
      message: `Need ${requiredCount} cases but only ${availableCount} available (after chapter non-repetition filter).`,
    });
  }

  // Check difficulty targets can be approximately met
  const targetEasy = Math.round((difficultyDist.easy / 100) * requiredCount);
  const targetModerate = Math.round((difficultyDist.moderate / 100) * requiredCount);
  const targetDifficult = Math.round((difficultyDist.difficult / 100) * requiredCount);

  const availByDiff: Record<CaseDifficulty, number> = { easy: 0, moderate: 0, difficult: 0 };
  for (const e of availableEntries) {
    availByDiff[e.difficulty]++;
  }

  if (targetEasy > 0 && availByDiff.easy < targetEasy) {
    issues.push({
      severity: 'warning',
      message: `Target ${targetEasy} easy cases but only ${availByDiff.easy} available.`,
    });
  }
  if (targetModerate > 0 && availByDiff.moderate < targetModerate) {
    issues.push({
      severity: 'warning',
      message: `Target ${targetModerate} moderate cases but only ${availByDiff.moderate} available.`,
    });
  }
  if (targetDifficult > 0 && availByDiff.difficult < targetDifficult) {
    issues.push({
      severity: 'warning',
      message: `Target ${targetDifficult} difficult cases but only ${availByDiff.difficult} available.`,
    });
  }

  // Check sub-questions — warn if any case has 0 questions
  const emptyCases = availableEntries.filter(e => e.subQuestionCount === 0);
  if (emptyCases.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${emptyCases.length} case(s) have no sub-questions and will be skipped during generation.`,
    });
  }

  const hasErrors = issues.some(i => i.severity === 'error');
  return { isValid: !hasErrors, issues };
}
