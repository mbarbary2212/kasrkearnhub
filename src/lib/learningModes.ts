/**
 * Learning Mode Awareness — Phase 2.5 (Session 4: migrated to ChapterStatus)
 *
 * Maps content types to three pedagogical modes:
 *   learning  → understanding (Socrates, videos, explanations, flashcards)
 *   practice  → application   (MCQs, SBA, matching, OSCE, cases)
 *   assessment → evaluation    (Test Yourself / formative exams)
 *
 * Used by the planner and recommended-path to assign the right activity type
 * based on chapter status instead of treating all activity equally.
 */

import type { ChapterStatus } from '@/lib/readiness';

// ─── Mode types ───────────────────────────────────────────────

export type LearningMode = 'learning' | 'practice' | 'assessment';

export interface ModeConfig {
  mode: LearningMode;
  label: string;
  /** Section key used in navigation */
  section: string;
  /** Default sub-tabs to recommend */
  defaultTabs: string[];
  /** Estimated minutes per task */
  estimatedMinutes: number;
  /** Task title suffix */
  taskDetail: string;
}

// ─── Content → Mode mapping ──────────────────────────────────

/** Map every tab / content key to a learning mode */
export const CONTENT_MODE_MAP: Record<string, LearningMode> = {
  // Learning mode (resources section)
  lectures: 'learning',
  flashcards: 'learning',
  guided_explanations: 'learning',
  reference_materials: 'learning',
  mind_maps: 'learning',
  clinical_tools: 'learning',

  // Practice mode
  mcqs: 'practice',
  sba: 'practice',
  true_false: 'practice',
  matching: 'practice',
  osce: 'practice',
  essays: 'practice',
  practical: 'practice',
  images: 'practice',
  cases: 'practice',
  pathways: 'practice',

  // Assessment mode
  test_yourself: 'assessment',
  formative: 'assessment',
  mock_exam: 'assessment',
};

// ─── Mode configs ────────────────────────────────────────────

export const MODE_CONFIGS: Record<LearningMode, ModeConfig> = {
  learning: {
    mode: 'learning',
    label: 'Learn & Understand',
    section: 'resources',
    defaultTabs: ['guided_explanations', 'lectures', 'flashcards'],
    estimatedMinutes: 15,
    taskDetail: 'Socrates + videos',
  },
  practice: {
    mode: 'practice',
    label: 'Practice & Apply',
    section: 'practice',
    defaultTabs: ['mcqs', 'sba', 'true_false'],
    estimatedMinutes: 15,
    taskDetail: '10–20 questions',
  },
  assessment: {
    mode: 'assessment',
    label: 'Test Yourself',
    section: 'practice',
    defaultTabs: ['mcqs', 'osce'],
    estimatedMinutes: 20,
    taskDetail: 'exam-style practice',
  },
};

// ─── State → Mode ratios ────────────────────────────────────

/**
 * For each ChapterStatus, defines what proportion of study time
 * should go to each mode. Values are weights (sum to 1).
 *
 * This is the SINGLE source of truth for status→mode mapping.
 */
export const STATUS_MODE_RATIOS: Record<ChapterStatus, Record<LearningMode, number>> = {
  not_started:     { learning: 1.0, practice: 0.0, assessment: 0.0 },
  started:         { learning: 0.7, practice: 0.3, assessment: 0.0 },
  building:        { learning: 0.4, practice: 0.5, assessment: 0.1 },
  needs_attention: { learning: 0.5, practice: 0.5, assessment: 0.0 },
  ready:           { learning: 0.1, practice: 0.4, assessment: 0.5 },
  strong:          { learning: 0.0, practice: 0.3, assessment: 0.7 },
};

/**
 * @deprecated Use STATUS_MODE_RATIOS instead. Kept for backward-compat
 * with any consumer that hasn't migrated yet.
 */
export const STATE_MODE_RATIOS = STATUS_MODE_RATIOS;

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Returns the primary (highest-weight) learning mode for a chapter status.
 */
export function getPrimaryMode(status: ChapterStatus): LearningMode {
  const ratios = STATUS_MODE_RATIOS[status] ?? STATUS_MODE_RATIOS.not_started;
  if (ratios.assessment >= ratios.practice && ratios.assessment >= ratios.learning) return 'assessment';
  if (ratios.practice >= ratios.learning) return 'practice';
  return 'learning';
}

/**
 * Returns the ModeConfig for the primary mode of a chapter status.
 */
export function getModeConfigForState(status: ChapterStatus): ModeConfig {
  return MODE_CONFIGS[getPrimaryMode(status)];
}

/**
 * Returns ordered list of modes by weight for a chapter status.
 * Only includes modes with weight > 0.
 */
export function getOrderedModes(status: ChapterStatus): { mode: LearningMode; weight: number }[] {
  const ratios = STATUS_MODE_RATIOS[status] ?? STATUS_MODE_RATIOS.not_started;
  return (Object.entries(ratios) as [LearningMode, number][])
    .filter(([, w]) => w > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([mode, weight]) => ({ mode, weight }));
}

/**
 * Classify a content key into its learning mode.
 */
export function getContentMode(contentKey: string): LearningMode {
  return CONTENT_MODE_MAP[contentKey] ?? 'learning';
}
