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
 * Select `count` questions from `pool`, preferring unseen questions.
 *
 * Steps:
 * 1. Split pool into unseen and seen
 * 2. Shuffle both groups independently
 * 3. Fill from unseen first, up to UNSEEN_TARGET_RATIO * count
 * 4. Fill remainder from seen (least-recently-seen first)
 * 5. If unseen pool is insufficient, relax and take more seen questions
 *
 * Does NOT enforce chapter balance — that's the caller's responsibility.
 * This function only reorders within whatever pool it receives.
 */
export function selectWithUnseenPreference<T extends HasId>(
  pool: T[],
  count: number,
  seenMap: Map<string, SeenQuestionInfo>,
): T[] {
  if (pool.length === 0) return [];
  const needed = Math.min(count, pool.length);

  // Split into unseen and seen
  const unseen: T[] = [];
  const seen: { q: T; info: SeenQuestionInfo }[] = [];

  for (const q of pool) {
    const info = seenMap.get(q.id);
    if (info) {
      seen.push({ q, info });
    } else {
      unseen.push(q);
    }
  }

  // Shuffle unseen randomly
  shuffleInPlace(unseen);

  // Sort seen: least recently seen first (so if we must use seen questions,
  // we prefer ones the student saw longest ago)
  seen.sort((a, b) => {
    const timeA = new Date(a.info.lastSeenAt).getTime();
    const timeB = new Date(b.info.lastSeenAt).getTime();
    return timeA - timeB; // oldest first
  });

  // Compute target unseen count
  const targetUnseen = Math.min(
    unseen.length,
    Math.ceil(needed * UNSEEN_TARGET_RATIO),
  );

  const result: T[] = [];

  // Take from unseen first
  result.push(...unseen.slice(0, targetUnseen));

  // Fill remaining from seen
  const remaining = needed - result.length;
  if (remaining > 0) {
    result.push(...seen.slice(0, remaining).map(s => s.q));
  }

  // If we still need more (shouldn't happen but safety), take remaining unseen
  if (result.length < needed) {
    const extra = unseen.slice(targetUnseen, targetUnseen + (needed - result.length));
    result.push(...extra);
  }

  // Final shuffle of the selected set so unseen aren't always first in the exam
  shuffleInPlace(result);

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
