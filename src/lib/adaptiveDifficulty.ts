/**
 * Difficulty-Adaptive MCQ Selection
 *
 * Reorders questions so the difficulty mix matches the student's chapter state.
 * Does NOT remove questions — just changes presentation order.
 *
 * All tuning constants are in one place for easy adjustment.
 */

import type { ChapterState } from '@/lib/studentMetrics';

// ─── Difficulty mix targets per chapter state ────────────────────
// Values are weights (not strict percentages). They guide proportional ordering.

export interface DifficultyMix {
  easy: number;
  medium: number;
  hard: number;
}

export const DIFFICULTY_MIX: Record<ChapterState, DifficultyMix> = {
  not_started: { easy: 0.80, medium: 0.15, hard: 0.05 },
  early:       { easy: 0.70, medium: 0.25, hard: 0.05 },
  weak:        { easy: 0.70, medium: 0.25, hard: 0.05 },
  unstable:    { easy: 0.40, medium: 0.40, hard: 0.20 },
  in_progress: { easy: 0.30, medium: 0.40, hard: 0.30 },
  strong:      { easy: 0.10, medium: 0.30, hard: 0.60 },
};

/** Fallback mix when chapter state is unknown */
export const DEFAULT_MIX: DifficultyMix = { easy: 0.33, medium: 0.34, hard: 0.33 };

// ─── Adaptive reordering ─────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

interface HasDifficulty {
  id: string;
  difficulty: Difficulty | null;
}

/**
 * Seeded PRNG (xoshiro128**-like) for deterministic but non-repeating shuffle.
 * Seed changes daily so the student sees a fresh order each day.
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Build a daily seed from a user-id-like string so order is stable within a day
 * but changes across days.
 */
function dailySeed(userId?: string): number {
  const dayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const raw = (userId || 'anon') + dayStr;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Reorder questions so the first N match the target difficulty mix,
 * with randomness within each difficulty bucket.
 *
 * Questions with `difficulty = null` are treated as medium.
 */
export function adaptiveReorder<T extends HasDifficulty>(
  questions: T[],
  chapterState: ChapterState | undefined,
  userId?: string,
): T[] {
  if (questions.length === 0) return questions;

  const mix = chapterState ? (DIFFICULTY_MIX[chapterState] ?? DEFAULT_MIX) : DEFAULT_MIX;
  const seed = dailySeed(userId);
  const total = questions.length;

  // Bucket questions by difficulty
  const buckets: Record<Difficulty, T[]> = { easy: [], medium: [], hard: [] };
  for (const q of questions) {
    const d: Difficulty = q.difficulty ?? 'medium';
    buckets[d].push(q);
  }

  // Shuffle each bucket with the daily seed
  buckets.easy = shuffleWithSeed(buckets.easy, seed);
  buckets.medium = shuffleWithSeed(buckets.medium, seed + 1);
  buckets.hard = shuffleWithSeed(buckets.hard, seed + 2);

  // Compute how many of each difficulty we want
  const targets = {
    easy: Math.round(total * mix.easy),
    medium: Math.round(total * mix.medium),
    hard: Math.round(total * mix.hard),
  };

  // Adjust for rounding: ensure total matches
  const targetSum = targets.easy + targets.medium + targets.hard;
  if (targetSum < total) targets.medium += (total - targetSum);
  if (targetSum > total) targets.medium -= (targetSum - total);

  // Take from each bucket up to the target, overflow goes to the end
  const ordered: T[] = [];
  const overflow: T[] = [];

  for (const diff of ['easy', 'medium', 'hard'] as Difficulty[]) {
    const bucket = buckets[diff];
    const take = Math.min(targets[diff], bucket.length);
    ordered.push(...bucket.slice(0, take));
    overflow.push(...bucket.slice(take));
  }

  // Append overflow (shuffled) so no questions are lost
  ordered.push(...shuffleWithSeed(overflow, seed + 3));

  return ordered;
}
