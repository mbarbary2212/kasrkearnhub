/**
 * Lightweight Incorrect-Question Resurfacing for MCQs
 *
 * Boosts previously-incorrect questions toward the front of the practice list.
 * Reduces boost once the student answers them correctly multiple times.
 * Does NOT remove or hide any questions — only adjusts ordering priority.
 *
 * All tuning constants are at the top for easy adjustment.
 */

// ─── Tuning constants ────────────────────────────────────────────

/** How many correct answers needed to clear the resurfacing boost */
export const CORRECT_COUNT_TO_CLEAR = 2;

/** Max fraction of the question list that can be resurfaced items (prevents repetition fatigue) */
export const MAX_RESURFACED_RATIO = 0.35;

/** Weight multiplier for most-recently-incorrect questions (highest boost) */
export const INCORRECT_BOOST = 3.0;

/** Weight multiplier for questions with mixed history (wrong before, some correct after) */
export const PARTIAL_BOOST = 1.5;

// ─── Types ───────────────────────────────────────────────────────

/** Minimal attempt record — must match what `useAllChapterQuestionAttempts` returns */
export interface AttemptSummary {
  question_id: string;
  is_correct: boolean | null;
}

export interface ResurfaceScore {
  questionId: string;
  /** 0 = no boost, higher = more urgently resurfaced */
  priority: number;
}

// ─── Core logic ──────────────────────────────────────────────────

/**
 * Compute a resurfacing priority for each question based on attempt history.
 *
 * The query returns rows ordered by `created_at DESC` so the first row per
 * question_id is the most recent attempt.
 *
 * Returns a Map<questionId, ResurfaceScore> where priority > 0 means "boost this question".
 */
export function computeResurfaceScores(
  attempts: AttemptSummary[],
): Map<string, ResurfaceScore> {
  // Track per-question: most-recent correctness + whether they ever got it wrong + correct count
  const stats = new Map<string, { latestCorrect: boolean | null; everWrong: boolean; correctCount: number; seen: boolean }>();

  // Attempts come ordered by created_at DESC, so first encounter per qid is the latest
  for (const a of attempts) {
    const existing = stats.get(a.question_id);
    if (!existing) {
      stats.set(a.question_id, {
        latestCorrect: a.is_correct,
        everWrong: a.is_correct === false,
        correctCount: a.is_correct ? 1 : 0,
        seen: true,
      });
    } else {
      // Older attempts
      if (a.is_correct === false) existing.everWrong = true;
      if (a.is_correct) existing.correctCount++;
    }
  }

  const scores = new Map<string, ResurfaceScore>();

  for (const [qid, s] of stats) {
    if (!s.everWrong) continue; // Never wrong → no resurfacing

    let priority = 0;

    if (s.correctCount >= CORRECT_COUNT_TO_CLEAR) {
      // Cleared: student has proven mastery
      priority = 0;
    } else if (s.latestCorrect === false) {
      // Most recently wrong → strongest boost
      priority = INCORRECT_BOOST;
    } else {
      // Got it wrong before but latest is correct — partial boost
      const remaining = CORRECT_COUNT_TO_CLEAR - s.correctCount;
      priority = PARTIAL_BOOST * (remaining / CORRECT_COUNT_TO_CLEAR);
    }

    if (priority > 0) {
      scores.set(qid, { questionId: qid, priority });
    }
  }

  return scores;
}

/**
 * Apply resurfacing to a question list that has already been difficulty-reordered.
 *
 * Moves high-priority resurfaced questions toward the front while:
 * - Capping resurfaced items to MAX_RESURFACED_RATIO of the list
 * - Preserving original order for non-resurfaced questions
 */
export function applyResurfacing<T extends { id: string }>(
  questions: T[],
  scores: Map<string, ResurfaceScore>,
): T[] {
  if (questions.length === 0 || scores.size === 0) return questions;

  const maxResurfaced = Math.max(1, Math.floor(questions.length * MAX_RESURFACED_RATIO));

  // Separate questions into boosted and normal
  const boosted: { q: T; priority: number }[] = [];
  const normal: T[] = [];

  for (const q of questions) {
    const score = scores.get(q.id);
    if (score && score.priority > 0) {
      boosted.push({ q, priority: score.priority });
    } else {
      normal.push(q);
    }
  }

  if (boosted.length === 0) return questions;

  // Sort boosted by priority descending, take up to max
  boosted.sort((a, b) => b.priority - a.priority);
  const taken = boosted.slice(0, maxResurfaced);
  const overflow = boosted.slice(maxResurfaced).map(b => b.q);

  // Interleave: boosted items first, then normal, then overflow
  return [...taken.map(b => b.q), ...normal, ...overflow];
}
