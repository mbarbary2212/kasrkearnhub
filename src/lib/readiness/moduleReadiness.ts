/**
 * Session 6 — Module Readiness Aggregation
 *
 * Pure function that aggregates ChapterReadinessResult[] into a single
 * ModuleReadinessResult.  Default equal weighting; accepts optional
 * weights map (chapterId → weight) for future exam-blueprint support.
 */

import { CALCULATION_VERSION } from './config';
import type {
  ChapterReadinessResult,
  ModuleReadinessResult,
  ComponentName,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────

const COMPONENT_NAMES: ComponentName[] = [
  'engagement',
  'performance',
  'retention',
  'consistency',
  'confidence',
];

/** Chapters that have any activity at all */
function startedOnly(chapters: ChapterReadinessResult[]): ChapterReadinessResult[] {
  return chapters.filter((c) => c.chapterStatus !== 'not_started');
}

/**
 * Normalise a weights map so values sum to 1.
 * Only keys present in `ids` are kept; missing keys get 0.
 */
function normaliseWeights(
  ids: string[],
  raw?: Record<string, number>,
): Record<string, number> {
  if (!raw) {
    const equal = 1 / ids.length;
    return Object.fromEntries(ids.map((id) => [id, equal]));
  }

  const mapped = ids.map((id) => [id, raw[id] ?? 0] as const);
  const sum = mapped.reduce((s, [, w]) => s + w, 0);

  if (sum <= 0) {
    const equal = 1 / ids.length;
    return Object.fromEntries(ids.map((id) => [id, equal]));
  }

  return Object.fromEntries(mapped.map(([id, w]) => [id, w / sum]));
}

// ── Main ─────────────────────────────────────────────────────────────────

const ZERO_RESULT: ModuleReadinessResult = {
  moduleReadiness: 0,
  chapterCount: 0,
  startedCount: 0,
  topContributors: [],
  weakestChapters: [],
  mainLimitingComponent: null,
  calculationVersion: CALCULATION_VERSION,
};

export function calculateModuleReadiness(
  chapters: ChapterReadinessResult[],
  weights?: Record<string, number>,
): ModuleReadinessResult {
  if (chapters.length === 0) return { ...ZERO_RESULT };

  const started = startedOnly(chapters);
  const chapterCount = chapters.length;
  const startedCount = started.length;

  // If nothing started, return zero-state with correct counts
  if (startedCount === 0) {
    return {
      ...ZERO_RESULT,
      chapterCount,
    };
  }

  // ── Weighted readiness score ────────────────────────────────────────
  const ids = chapters.map((c) => c.chapterId);
  const w = normaliseWeights(ids, weights);

  const moduleReadiness = Math.round(
    chapters.reduce((sum, c) => sum + c.readinessScore * (w[c.chapterId] ?? 0), 0),
  );

  // ── Top contributors & weakest (from started chapters only) ────────
  const sorted = [...started].sort((a, b) => b.readinessScore - a.readinessScore);
  const topContributors = sorted.slice(0, 3).map((c) => c.chapterId);
  const weakestChapters = sorted
    .slice()
    .reverse()
    .slice(0, 3)
    .map((c) => c.chapterId);

  // ── Main limiting component ────────────────────────────────────────
  const componentAverages: Record<ComponentName, number> = {} as any;

  for (const name of COMPONENT_NAMES) {
    const total = started.reduce((s, c) => s + c.componentScores[name], 0);
    componentAverages[name] = total / startedCount;
  }

  let mainLimitingComponent: ComponentName | null = null;
  let lowestAvg = Infinity;

  for (const name of COMPONENT_NAMES) {
    if (componentAverages[name] < lowestAvg) {
      lowestAvg = componentAverages[name];
      mainLimitingComponent = name;
    }
  }

  return {
    moduleReadiness,
    chapterCount,
    startedCount,
    topContributors,
    weakestChapters,
    mainLimitingComponent,
    calculationVersion: CALCULATION_VERSION,
  };
}
