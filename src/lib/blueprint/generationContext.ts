/**
 * Blueprint Generation Context
 *
 * This module defines the typed contract for future exam generation.
 * It resolves all eligibility, component specs, and rules into a single
 * structured object that a generator can consume.
 *
 * ⚠️  This does NOT generate exams — it only prepares the data context.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ASSESSMENT_RULE_DEFINITIONS,
  DIFFICULTY_RULE_KEY,
  DEFAULT_DIFFICULTY_DISTRIBUTION,
} from '@/hooks/useAssessmentBlueprint';
import type {
  AssessmentStructure,
  AssessmentComponent,
  ChapterEligibility,
  AssessmentRule,
  AssessmentRuleKey,
  DifficultyDistribution,
} from '@/hooks/useAssessmentBlueprint';

// ── Output types ──

export interface EligibleChapter {
  chapterId: string;
  allowMcq: boolean;
  allowRecall: boolean;
  allowCase: boolean;
}

export interface ComponentSpec {
  componentId: string;
  componentType: string;
  questionCount: number;
  marksPerQuestion: number;
  totalMarks: number;
  /** Chapter IDs eligible for this specific component */
  eligibleChapterIds: string[];
}

export interface GenerationRules {
  noChapterRecallAndCase: boolean;
  noMcqTopicRepeat: boolean;
  onlyEligibleChapters: boolean;
  partialPoolAllowed: boolean;
  difficultyDistribution: DifficultyDistribution;
}

export interface GenerationContext {
  assessment: AssessmentStructure;
  components: ComponentSpec[];
  eligibleChapters: EligibleChapter[];
  rules: GenerationRules;
}

// ── Map component_type → eligibility field ──

const COMPONENT_TO_ELIGIBILITY_FIELD: Record<string, keyof Pick<ChapterEligibility, 'allow_mcq' | 'allow_recall' | 'allow_case'>> = {
  mcq: 'allow_mcq',
  short_answer_recall: 'allow_recall',
  short_answer_case: 'allow_case',
};

// ── Resolver ──

/**
 * Resolves the full generation context for a given assessment.
 * Call this when you're ready to build the generator.
 *
 * Usage:
 *   const ctx = await resolveGenerationContext(assessmentId);
 *   // ctx.components[0].eligibleChapterIds → chapters allowed for that component
 *   // ctx.rules.noChapterRecallAndCase → true/false
 */
export async function resolveGenerationContext(assessmentId: string): Promise<GenerationContext> {
  // Fetch all data in parallel
  const [assessmentRes, componentsRes, eligibilityRes, rulesRes] = await Promise.all([
    supabase.from('assessment_structures').select('*').eq('id', assessmentId).single(),
    supabase.from('assessment_components').select('*').eq('assessment_id', assessmentId).order('display_order'),
    supabase.from('assessment_chapter_eligibility').select('*').eq('assessment_id', assessmentId),
    supabase.from('assessment_rules').select('*').eq('assessment_id', assessmentId),
  ]);

  if (assessmentRes.error) throw assessmentRes.error;
  if (componentsRes.error) throw componentsRes.error;
  if (eligibilityRes.error) throw eligibilityRes.error;
  if (rulesRes.error) throw rulesRes.error;

  const assessment = assessmentRes.data as AssessmentStructure;
  const rawComponents = componentsRes.data as AssessmentComponent[];
  const rawEligibility = eligibilityRes.data as ChapterEligibility[];
  const rawRules = rulesRes.data as AssessmentRule[];

  // Build eligible chapters (only those with included_in_exam = true)
  const eligibleChapters: EligibleChapter[] = rawEligibility
    .filter(e => e.included_in_exam)
    .map(e => ({
      chapterId: e.chapter_id,
      allowMcq: e.allow_mcq,
      allowRecall: e.allow_recall,
      allowCase: e.allow_case,
    }));

  // Build component specs with per-component eligible chapter filtering
  const components: ComponentSpec[] = rawComponents.map(comp => {
    const eligibilityField = COMPONENT_TO_ELIGIBILITY_FIELD[comp.component_type];
    const eligibleChapterIds = eligibilityField
      ? eligibleChapters.filter(ch => ch[camelField(eligibilityField)]).map(ch => ch.chapterId)
      : eligibleChapters.map(ch => ch.chapterId); // fallback: all included chapters

    return {
      componentId: comp.id,
      componentType: comp.component_type,
      questionCount: comp.question_count,
      marksPerQuestion: comp.marks_per_question,
      totalMarks: comp.question_count * comp.marks_per_question,
      eligibleChapterIds,
    };
  });

  // Resolve rules with defaults
  const ruleMap = new Map(rawRules.map(r => [r.rule_key, r.rule_value]));
  const getRule = (key: AssessmentRuleKey): boolean => {
    const stored = ruleMap.get(key);
    if (stored !== undefined) return stored as unknown as boolean;
    const def = ASSESSMENT_RULE_DEFINITIONS.find(d => d.key === key);
    return def?.defaultValue ?? true;
  };

  // Resolve difficulty distribution
  const difficultyRule = ruleMap.get(DIFFICULTY_RULE_KEY);
  const difficultyDistribution: DifficultyDistribution =
    difficultyRule && typeof difficultyRule === 'object' && difficultyRule !== null
      ? {
          easy: (difficultyRule as Record<string, number>).easy ?? DEFAULT_DIFFICULTY_DISTRIBUTION.easy,
          moderate: (difficultyRule as Record<string, number>).moderate ?? DEFAULT_DIFFICULTY_DISTRIBUTION.moderate,
          difficult: (difficultyRule as Record<string, number>).difficult ?? DEFAULT_DIFFICULTY_DISTRIBUTION.difficult,
        }
      : { ...DEFAULT_DIFFICULTY_DISTRIBUTION };

  const rules: GenerationRules = {
    noChapterRecallAndCase: getRule('no_chapter_recall_and_case'),
    noMcqTopicRepeat: getRule('no_mcq_topic_repeat'),
    onlyEligibleChapters: getRule('only_eligible_chapters'),
    partialPoolAllowed: getRule('partial_pool_allowed'),
    difficultyDistribution,
  };

  return { assessment, components, eligibleChapters, rules };
}

// ── Helpers ──

function camelField(field: 'allow_mcq' | 'allow_recall' | 'allow_case'): 'allowMcq' | 'allowRecall' | 'allowCase' {
  const map: Record<string, 'allowMcq' | 'allowRecall' | 'allowCase'> = {
    allow_mcq: 'allowMcq',
    allow_recall: 'allowRecall',
    allow_case: 'allowCase',
  };
  return map[field];
}

// ── Validation utilities (for pre-generation checks) ──

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Validates a GenerationContext before generation.
 * Returns an array of issues — empty means ready to generate.
 */
export function validateGenerationContext(ctx: GenerationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check each component has at least one eligible chapter
  for (const comp of ctx.components) {
    if (comp.eligibleChapterIds.length === 0) {
      issues.push({
        severity: 'error',
        message: `Component "${comp.componentType}" has no eligible chapters. Add chapters to its question pool.`,
      });
    }
    if (comp.questionCount <= 0) {
      issues.push({
        severity: 'warning',
        message: `Component "${comp.componentType}" has 0 questions configured.`,
      });
    }
  }

  // Check recall/case overlap rule
  if (ctx.rules.noChapterRecallAndCase) {
    const recallComp = ctx.components.find(c => c.componentType === 'short_answer_recall');
    const caseComp = ctx.components.find(c => c.componentType === 'short_answer_case');
    if (recallComp && caseComp) {
      const overlap = recallComp.eligibleChapterIds.filter(id =>
        caseComp.eligibleChapterIds.includes(id)
      );
      if (overlap.length > 0) {
        issues.push({
          severity: 'warning',
          message: `${overlap.length} chapter(s) are eligible for both Recall and Case. The "no overlap" rule will exclude them from one component at generation time.`,
        });
      }
    }
  }

  // Check difficulty distribution totals 100
  const { easy, moderate, difficult } = ctx.rules.difficultyDistribution;
  const diffTotal = easy + moderate + difficult;
  if (diffTotal !== 100) {
    issues.push({
      severity: 'error',
      message: `Difficulty distribution totals ${diffTotal}% — it must equal 100%.`,
    });
  }

  // Check total eligible chapters
  if (ctx.eligibleChapters.length === 0) {
    issues.push({
      severity: 'error',
      message: 'No chapters are marked as eligible. Add chapters to the question pool.',
    });
  }

  return issues;
}
