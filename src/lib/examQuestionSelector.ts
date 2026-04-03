/**
 * Exam Question Selector — Unseen-first selection with configurable fallback
 *
 * Prioritizes questions the student has NOT seen in practice,
 * while preserving existing blueprint/difficulty constraints.
 *
 * All tuning constants are at the top.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Tuning constants ────────────────────────────────────────────

/** Fraction of exam that MUST be unseen if enough unseen questions exist (0-1) */
export const UNSEEN_TARGET_RATIO = 0.80;

/** Minimum fraction of the exam that should be unseen before we relax the constraint */
export const UNSEEN_MIN_RATIO = 0.50;

/**
 * When we don't have enough unseen questions for UNSEEN_TARGET_RATIO,
 * deprioritize recently-seen questions by sorting them to the back.
 * This value controls "how recent" matters (in days).
 */
export const RECENCY_WINDOW_DAYS = 14;

// ─── Types ───────────────────────────────────────────────────────

export interface SeenQuestionInfo {
  questionId: string;
  /** Most recent attempt timestamp (ISO string) */
  lastSeenAt: string;
  /** Whether the student got it correct on the latest attempt */
  wasCorrect: boolean | null;
}

interface HasId {
  id: string;
  chapter_id?: string | null;
}

// ─── Fetch seen question IDs ─────────────────────────────────────

/**
 * Fetch which MCQs the student has already attempted, for a given module.
 * Returns a Map<questionId, SeenQuestionInfo>.
 */
export async function fetchSeenQuestionIds(
  userId: string,
  moduleId: string,
): Promise<Map<string, SeenQuestionInfo>> {
  // Fetch most-recent attempts per question. Limit to 5000 rows to bound payload.
  const { data, error } = await supabase
    .from('question_attempts')
    .select('question_id, is_correct, created_at')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .eq('question_type', 'mcq')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    console.error('Failed to fetch seen questions:', error);
    return new Map();
  }

  const seen = new Map<string, SeenQuestionInfo>();
  for (const row of data || []) {
    // Only keep the most recent attempt per question (query is ordered desc)
    if (!seen.has(row.question_id)) {
      seen.set(row.question_id, {
        questionId: row.question_id,
        lastSeenAt: row.created_at,
        wasCorrect: row.is_correct,
      });
    }
  }
  return seen;
}

// ─── Selection logic ─────────────────────────────────────────────

/**
 * Select `count` questions from `pool`, preferring unseen questions
 * while preserving chapter balance.
 *
 * Steps:
 * 1. Group pool by chapter_id
 * 2. Compute per-chapter quotas proportional to pool distribution
 * 3. Within each chapter, prefer unseen questions (up to UNSEEN_TARGET_RATIO)
 * 4. Fill remainder from seen (least-recently-seen first)
 * 5. Merge all chapter selections and final-shuffle
 *
 * This ensures blueprint chapter distribution is preserved.
 */
export function selectWithUnseenPreference<T extends HasId>(
  pool: T[],
  count: number,
  seenMap: Map<string, SeenQuestionInfo>,
): T[] {
  if (pool.length === 0) return [];
  const needed = Math.min(count, pool.length);

  // Group by chapter_id (null → '__none__')
  const byChapter = new Map<string, T[]>();
  for (const q of pool) {
    const key = q.chapter_id ?? '__none__';
    const arr = byChapter.get(key);
    if (arr) arr.push(q);
    else byChapter.set(key, [q]);
  }

  // Compute proportional quotas per chapter
  const chapterKeys = [...byChapter.keys()];
  const quotas = new Map<string, number>();
  let assigned = 0;
  for (let i = 0; i < chapterKeys.length; i++) {
    const key = chapterKeys[i];
    const chapterPool = byChapter.get(key)!;
    if (i === chapterKeys.length - 1) {
      // Last chapter gets the remainder to avoid rounding drift
      quotas.set(key, needed - assigned);
    } else {
      const quota = Math.round((chapterPool.length / pool.length) * needed);
      quotas.set(key, quota);
      assigned += quota;
    }
  }

  // Select within each chapter with unseen preference
  const result: T[] = [];
  for (const [key, chapterPool] of byChapter) {
    const quota = Math.min(quotas.get(key) ?? 0, chapterPool.length);
    if (quota <= 0) continue;
    result.push(...selectFromSlice(chapterPool, quota, seenMap));
  }

  // Final shuffle so chapters aren't grouped together in the exam
  shuffleInPlace(result);
  return result;
}

/**
 * Select `count` items from a single-chapter slice, preferring unseen.
 */
function selectFromSlice<T extends HasId>(
  slice: T[],
  count: number,
  seenMap: Map<string, SeenQuestionInfo>,
): T[] {
  const unseen: T[] = [];
  const seen: { q: T; info: SeenQuestionInfo }[] = [];

  for (const q of slice) {
    const info = seenMap.get(q.id);
    if (info) {
      seen.push({ q, info });
    } else {
      unseen.push(q);
    }
  }

  shuffleInPlace(unseen);
  // Least-recently-seen first for fallback
  seen.sort((a, b) =>
    new Date(a.info.lastSeenAt).getTime() - new Date(b.info.lastSeenAt).getTime()
  );

  const targetUnseen = Math.min(unseen.length, Math.ceil(count * UNSEEN_TARGET_RATIO));
  const result: T[] = [];
  result.push(...unseen.slice(0, targetUnseen));

  const remaining = count - result.length;
  if (remaining > 0) {
    result.push(...seen.slice(0, remaining).map(s => s.q));
  }

  // Safety: fill from remaining unseen if still short
  if (result.length < count) {
    result.push(...unseen.slice(targetUnseen, targetUnseen + (count - result.length)));
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
