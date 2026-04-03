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

/** How many correct answers in a row before the boost fully decays */
export const CORRECT_STREAK_TO_CLEAR = 2;

/** Max fraction of the question list that can be resurfaced items (prevents repetition fatigue) */
export const MAX_RESURFACED_RATIO = 0.35;

/** Minimum gap (in hours) before re-showing a recently-attempted question */
export const MIN_COOLDOWN_HOURS = 4;

/** Weight multiplier for incorrect questions (higher = stronger boost) */
export const INCORRECT_BOOST = 3.0;

/** Weight multiplier for questions answered correctly fewer than CORRECT_STREAK_TO_CLEAR times */
export const PARTIAL_BOOST = 1.5;

// ─── Types ───────────────────────────────────────────────────────

export interface AttemptRecord {
  question_id: string;
  is_correct: boolean | null;
  created_at: string;       // ISO timestamp
  attempt_number: number;
}

export interface ResurfaceScore {
  questionId: string;
  /** 0 = no boost, higher = more urgently resurfaced */
  priority: number;
  /** true if the question is in cooldown and should NOT be boosted */
  inCooldown: boolean;
}

// ─── Core logic ──────────────────────────────────────────────────

/**
 * Compute a resurfacing priority for each question based on attempt history.
 *
 * Returns a Map<questionId, priority> where priority > 0 means "boost this question".
 */
export function computeResurfaceScores(
  allAttempts: AttemptRecord[],
  nowMs: number = Date.now(),
): Map<string, ResurfaceScore> {
  // Group attempts by question, ordered by attempt_number desc
  const byQuestion = new Map<string, AttemptRecord[]>();
  for (const a of allAttempts) {
    const list = byQuestion.get(a.question_id) || [];
    list.push(a);
    byQuestion.set(a.question_id, list);
  }

  const scores = new Map<string, ResurfaceScore>();
  const cooldownMs = MIN_COOLDOWN_HOURS * 3600_000;

  for (const [qid, attempts] of byQuestion) {
    // Sort by attempt_number descending (most recent first)
    attempts.sort((a, b) => b.attempt_number - a.attempt_number);

    const latest = attempts[0];
    const latestTime = new Date(latest.created_at).getTime();
    const inCooldown = (nowMs - latestTime) < cooldownMs;

    // Count consecutive correct answers from the most recent attempt backwards
    let correctStreak = 0;
    for (const a of attempts) {
      if (a.is_correct) correctStreak++;
      else break;
    }

    // Has the student ever gotten it wrong?
    const hasIncorrect = attempts.some(a => a.is_correct === false);

    let priority = 0;

    if (!hasIncorrect) {
      // Never wrong → no resurfacing needed
      priority = 0;
    } else if (correctStreak >= CORRECT_STREAK_TO_CLEAR) {
      // Cleared: answered correctly enough times after getting it wrong
      priority = 0;
    } else if (latest.is_correct === false) {
      // Most recently wrong → strongest boost
      priority = INCORRECT_BOOST;
    } else {
      // Got it wrong before, answered correctly fewer than threshold times
      priority = PARTIAL_BOOST * (1 - correctStreak / CORRECT_STREAK_TO_CLEAR);
    }

    // Apply recency decay: questions wrong longer ago get slightly less boost
    if (priority > 0) {
      const hoursSince = (nowMs - latestTime) / 3600_000;
      // Gentle decay: halve boost over 7 days
      const decay = Math.max(0.5, 1 - (hoursSince / (7 * 24)));
      priority *= decay;
    }

    if (priority > 0 || inCooldown) {
      scores.set(qid, { questionId: qid, priority, inCooldown });
    }
  }

  return scores;
}

/**
 * Apply resurfacing to a question list that has already been difficulty-reordered.
 *
 * Moves high-priority resurfaced questions toward the front while:
 * - Respecting cooldown (don't boost questions attempted very recently)
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
    if (score && score.priority > 0 && !score.inCooldown) {
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
