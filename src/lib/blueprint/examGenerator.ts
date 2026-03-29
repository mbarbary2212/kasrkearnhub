/**
 * Exam Assembly Engine
 *
 * Generates an exam instance from a resolved GenerationContext.
 * Selects questions per component, respecting eligibility, difficulty
 * distribution, topic uniqueness, and chapter overlap rules.
 *
 * Does NOT build UI — pure data logic + Supabase persistence.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  resolveGenerationContext,
  validateGenerationContext,
  COMPONENT_CONTENT_SOURCE,
} from './generationContext';
import type {
  GenerationContext,
  ComponentSpec,
  GenerationRules,
} from './generationContext';

// ── Types ──

export interface GeneratedQuestion {
  questionId: string;
  componentId: string;
  componentType: string;
  chapterId: string | null;
  topicId: string | null;
  difficulty: string | null;
  marks: number;
  displayOrder: number;
}

export interface GenerationResult {
  success: boolean;
  instanceId?: string;
  questions: GeneratedQuestion[];
  warnings: string[];
  errors: string[];
}

interface PoolQuestion {
  id: string;
  chapter_id: string | null;
  topic_id: string | null;
  difficulty: string | null;
}

// ── Difficulty normalisation ──
// MCQ enum: easy / medium / hard
// Case enum: easy / moderate / difficult
// Blueprint target: easy / moderate / difficult

function normaliseDifficulty(raw: string | null, componentType: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (componentType === 'mcq') {
    if (lower === 'medium') return 'moderate';
    if (lower === 'hard') return 'difficult';
  }
  return lower;
}

// ── Pool fetchers ──

async function fetchMcqPool(chapterIds: string[]): Promise<PoolQuestion[]> {
  if (!chapterIds.length) return [];
  const { data, error } = await supabase
    .from('mcqs')
    .select('id, chapter_id, topic_id, difficulty')
    .in('chapter_id', chapterIds)
    .eq('is_deleted', false);
  if (error) throw error;
  return (data || []).map(q => ({
    ...q,
    difficulty: normaliseDifficulty(q.difficulty, 'mcq'),
  }));
}

async function fetchRecallPool(chapterIds: string[]): Promise<PoolQuestion[]> {
  if (!chapterIds.length) return [];
  const { data, error } = await supabase
    .from('osce_questions')
    .select('id, chapter_id, topic_id, difficulty')
    .in('chapter_id', chapterIds)
    .eq('is_deleted', false)
    .eq('legacy_archived', false);
  if (error) throw error;
  return (data || []).map(q => ({
    ...q,
    difficulty: normaliseDifficulty(q.difficulty, 'short_answer_recall'),
  }));
}

async function fetchCasePool(chapterIds: string[]): Promise<PoolQuestion[]> {
  if (!chapterIds.length) return [];
  const { data, error } = await supabase
    .from('case_scenarios')
    .select('id, chapter_id, topic_id, difficulty')
    .in('chapter_id', chapterIds)
    .eq('is_deleted', false);
  if (error) throw error;
  return (data || []).map(q => ({
    ...q,
    difficulty: normaliseDifficulty(q.difficulty, 'short_answer_case'),
  }));
}

// ── Shuffle utility (Fisher-Yates) ──

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Selection helpers ──

/**
 * Select questions respecting difficulty distribution with tolerance.
 * Falls back to filling remaining slots from any difficulty if targets can't be met.
 */
function selectWithDifficulty(
  pool: PoolQuestion[],
  count: number,
  distribution: { easy: number; moderate: number; difficult: number },
  opts?: { excludeTopicIds?: Set<string> }
): { selected: PoolQuestion[]; warnings: string[] } {
  const warnings: string[] = [];
  const usedTopics = opts?.excludeTopicIds ? new Set(opts.excludeTopicIds) : new Set<string>();

  // Group by normalised difficulty
  const byDiff: Record<string, PoolQuestion[]> = { easy: [], moderate: [], difficult: [], unknown: [] };
  for (const q of shuffle(pool)) {
    const d = q.difficulty || 'unknown';
    (byDiff[d] || (byDiff[d] = [])).push(q);
  }

  // Calculate targets
  const targets = {
    easy: Math.round((distribution.easy / 100) * count),
    moderate: Math.round((distribution.moderate / 100) * count),
    difficult: 0, // remainder
  };
  targets.difficult = count - targets.easy - targets.moderate;

  const selected: PoolQuestion[] = [];
  const usedIds = new Set<string>();

  const pickFrom = (bucket: PoolQuestion[], n: number, enforceTopicUnique: boolean): number => {
    let picked = 0;
    for (const q of bucket) {
      if (picked >= n) break;
      if (usedIds.has(q.id)) continue;
      if (enforceTopicUnique && q.topic_id && usedTopics.has(q.topic_id)) continue;
      selected.push(q);
      usedIds.add(q.id);
      if (q.topic_id) usedTopics.add(q.topic_id);
      picked++;
    }
    return picked;
  };

  const enforceTopicUnique = !!opts?.excludeTopicIds || true; // always enforce for MCQ

  // Pick by difficulty tier
  for (const tier of ['easy', 'moderate', 'difficult'] as const) {
    const target = targets[tier];
    const picked = pickFrom(byDiff[tier], target, enforceTopicUnique);
    if (picked < target) {
      warnings.push(`Only ${picked}/${target} ${tier} questions available`);
    }
  }

  // Fill remaining from any bucket (including unknown)
  const remaining = count - selected.length;
  if (remaining > 0) {
    const allRemaining = shuffle(
      [...byDiff.easy, ...byDiff.moderate, ...byDiff.difficult, ...byDiff.unknown]
        .filter(q => !usedIds.has(q.id))
    );
    const filled = pickFrom(allRemaining, remaining, enforceTopicUnique);
    if (filled < remaining) {
      // Try again without topic uniqueness constraint
      const stillNeeded = remaining - filled;
      const lastResort = shuffle(
        [...byDiff.easy, ...byDiff.moderate, ...byDiff.difficult, ...byDiff.unknown]
          .filter(q => !usedIds.has(q.id))
      );
      const filledLast = pickFrom(lastResort, stillNeeded, false);
      if (filledLast < stillNeeded) {
        warnings.push(`Could only select ${selected.length}/${count} questions total (pool exhausted)`);
      }
    }
  }

  return { selected, warnings };
}

/**
 * Simple selection without difficulty (for Recall / components without difficulty data).
 */
function selectSimple(
  pool: PoolQuestion[],
  count: number,
  excludeChapterIds?: Set<string>
): { selected: PoolQuestion[]; usedChapterIds: Set<string>; warnings: string[] } {
  const warnings: string[] = [];
  const shuffled = shuffle(pool);
  const selected: PoolQuestion[] = [];
  const usedChapterIds = new Set<string>();
  const usedIds = new Set<string>();

  for (const q of shuffled) {
    if (selected.length >= count) break;
    if (usedIds.has(q.id)) continue;
    if (excludeChapterIds && q.chapter_id && excludeChapterIds.has(q.chapter_id)) continue;
    selected.push(q);
    usedIds.add(q.id);
    if (q.chapter_id) usedChapterIds.add(q.chapter_id);
  }

  if (selected.length < count) {
    warnings.push(`Could only select ${selected.length}/${count} questions (pool exhausted)`);
  }

  return { selected, usedChapterIds, warnings };
}

// ── Main assembly ──

export async function assembleExam(assessmentId: string, label?: string): Promise<GenerationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Resolve context
  let ctx: GenerationContext;
  try {
    ctx = await resolveGenerationContext(assessmentId);
  } catch (err: any) {
    return { success: false, questions: [], warnings, errors: [`Failed to resolve context: ${err.message}`] };
  }

  // 2. Validate
  const issues = validateGenerationContext(ctx);
  for (const issue of issues) {
    if (issue.severity === 'error') errors.push(issue.message);
    else warnings.push(issue.message);
  }
  if (errors.length > 0) {
    return { success: false, questions: [], warnings, errors };
  }

  // 3. Fetch pools per component
  const recallComp = ctx.components.find(c => c.componentType === 'short_answer_recall');
  const caseComp = ctx.components.find(c => c.componentType === 'short_answer_case');
  const mcqComp = ctx.components.find(c => c.componentType === 'mcq');

  const allQuestions: GeneratedQuestion[] = [];
  let globalOrder = 0;

  // Track chapters used by Recall (for the no-overlap rule)
  let recallUsedChapters = new Set<string>();

  // ── Process Recall FIRST (so we know which chapters to exclude from Case) ──
  if (recallComp && recallComp.questionCount > 0) {
    const pool = await fetchRecallPool(recallComp.eligibleChapterIds);
    const { selected, usedChapterIds, warnings: w } = selectSimple(pool, recallComp.questionCount);
    warnings.push(...w);
    recallUsedChapters = usedChapterIds;

    for (const q of selected) {
      globalOrder++;
      allQuestions.push({
        questionId: q.id,
        componentId: recallComp.componentId,
        componentType: 'short_answer_recall',
        chapterId: q.chapter_id,
        topicId: q.topic_id,
        difficulty: q.difficulty,
        marks: recallComp.marksPerQuestion,
        displayOrder: globalOrder,
      });
    }
  }

  // ── Process Case (exclude recall chapters if rule active) ──
  if (caseComp && caseComp.questionCount > 0) {
    const excludeChapters = ctx.rules.noChapterRecallAndCase ? recallUsedChapters : undefined;
    const pool = await fetchCasePool(caseComp.eligibleChapterIds);
    const { selected, warnings: w } = selectSimple(pool, caseComp.questionCount, excludeChapters);
    warnings.push(...w);

    for (const q of selected) {
      globalOrder++;
      allQuestions.push({
        questionId: q.id,
        componentId: caseComp.componentId,
        componentType: 'short_answer_case',
        chapterId: q.chapter_id,
        topicId: q.topic_id,
        difficulty: q.difficulty,
        marks: caseComp.marksPerQuestion,
        displayOrder: globalOrder,
      });
    }
  }

  // ── Process MCQ (with difficulty distribution + topic uniqueness) ──
  if (mcqComp && mcqComp.questionCount > 0) {
    const pool = await fetchMcqPool(mcqComp.eligibleChapterIds);
    const { selected, warnings: w } = selectWithDifficulty(
      pool,
      mcqComp.questionCount,
      ctx.rules.difficultyDistribution,
      { excludeTopicIds: ctx.rules.noMcqTopicRepeat ? new Set<string>() : undefined }
    );
    warnings.push(...w);

    for (const q of selected) {
      globalOrder++;
      allQuestions.push({
        questionId: q.id,
        componentId: mcqComp.componentId,
        componentType: 'mcq',
        chapterId: q.chapter_id,
        topicId: q.topic_id,
        difficulty: q.difficulty,
        marks: mcqComp.marksPerQuestion,
        displayOrder: globalOrder,
      });
    }
  }

  if (allQuestions.length === 0) {
    return { success: false, questions: allQuestions, warnings, errors: ['No questions could be selected from the available pools.'] };
  }

  // 4. Persist to DB
  const totalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

  const { data: instance, error: instErr } = await supabase
    .from('exam_instances')
    .insert({
      assessment_id: assessmentId,
      label: label || `Exam ${new Date().toLocaleDateString()}`,
      generation_rules: ctx.rules as any,
      total_marks: totalMarks,
      status: 'draft',
      metadata: {
        component_summary: ctx.components.map(c => ({
          type: c.componentType,
          requested: c.questionCount,
          selected: allQuestions.filter(q => q.componentType === c.componentType).length,
        })),
        eligible_chapter_count: ctx.eligibleChapters.length,
        warnings,
      },
    } as any)
    .select('id')
    .single();

  if (instErr) {
    return { success: false, questions: allQuestions, warnings, errors: [`Failed to create exam instance: ${instErr.message}`] };
  }

  const instanceId = instance.id;

  // Insert questions in batch
  const questionRows = allQuestions.map(q => ({
    instance_id: instanceId,
    component_id: q.componentId,
    component_type: q.componentType,
    question_id: q.questionId,
    chapter_id: q.chapterId,
    topic_id: q.topicId,
    difficulty: q.difficulty,
    display_order: q.displayOrder,
    marks: q.marks,
  }));

  const { error: qErr } = await supabase
    .from('exam_instance_questions')
    .insert(questionRows as any);

  if (qErr) {
    // Rollback instance
    await supabase.from('exam_instances').delete().eq('id', instanceId);
    return { success: false, questions: allQuestions, warnings, errors: [`Failed to save questions: ${qErr.message}`] };
  }

  return { success: true, instanceId, questions: allQuestions, warnings, errors };
}

// ── Convenience: validate-only (dry run without persisting) ──

export async function dryRunAssembly(assessmentId: string): Promise<Omit<GenerationResult, 'instanceId'>> {
  const warnings: string[] = [];
  const errors: string[] = [];

  let ctx: GenerationContext;
  try {
    ctx = await resolveGenerationContext(assessmentId);
  } catch (err: any) {
    return { success: false, questions: [], warnings, errors: [`Failed to resolve context: ${err.message}`] };
  }

  const issues = validateGenerationContext(ctx);
  for (const issue of issues) {
    if (issue.severity === 'error') errors.push(issue.message);
    else warnings.push(issue.message);
  }

  if (errors.length > 0) {
    return { success: false, questions: [], warnings, errors };
  }

  // Fetch and select without persisting
  const recallComp = ctx.components.find(c => c.componentType === 'short_answer_recall');
  const caseComp = ctx.components.find(c => c.componentType === 'short_answer_case');
  const mcqComp = ctx.components.find(c => c.componentType === 'mcq');

  const allQuestions: GeneratedQuestion[] = [];
  let globalOrder = 0;
  let recallUsedChapters = new Set<string>();

  if (recallComp && recallComp.questionCount > 0) {
    const pool = await fetchRecallPool(recallComp.eligibleChapterIds);
    const { selected, usedChapterIds, warnings: w } = selectSimple(pool, recallComp.questionCount);
    warnings.push(...w);
    recallUsedChapters = usedChapterIds;
    for (const q of selected) {
      globalOrder++;
      allQuestions.push({ questionId: q.id, componentId: recallComp.componentId, componentType: 'short_answer_recall', chapterId: q.chapter_id, topicId: q.topic_id, difficulty: q.difficulty, marks: recallComp.marksPerQuestion, displayOrder: globalOrder });
    }
  }

  if (caseComp && caseComp.questionCount > 0) {
    const excludeChapters = ctx.rules.noChapterRecallAndCase ? recallUsedChapters : undefined;
    const pool = await fetchCasePool(caseComp.eligibleChapterIds);
    const { selected, warnings: w } = selectSimple(pool, caseComp.questionCount, excludeChapters);
    warnings.push(...w);
    for (const q of selected) {
      globalOrder++;
      allQuestions.push({ questionId: q.id, componentId: caseComp.componentId, componentType: 'short_answer_case', chapterId: q.chapter_id, topicId: q.topic_id, difficulty: q.difficulty, marks: caseComp.marksPerQuestion, displayOrder: globalOrder });
    }
  }

  if (mcqComp && mcqComp.questionCount > 0) {
    const pool = await fetchMcqPool(mcqComp.eligibleChapterIds);
    const { selected, warnings: w } = selectWithDifficulty(pool, mcqComp.questionCount, ctx.rules.difficultyDistribution, { excludeTopicIds: ctx.rules.noMcqTopicRepeat ? new Set<string>() : undefined });
    warnings.push(...w);
    for (const q of selected) {
      globalOrder++;
      allQuestions.push({ questionId: q.id, componentId: mcqComp.componentId, componentType: 'mcq', chapterId: q.chapter_id, topicId: q.topic_id, difficulty: q.difficulty, marks: mcqComp.marksPerQuestion, displayOrder: globalOrder });
    }
  }

  return { success: allQuestions.length > 0, questions: allQuestions, warnings, errors };
}
