/**
 * Configurable thresholds for the adaptive study planner.
 * Centralised here so they can later be moved to admin-configurable settings
 * without touching planner logic.
 */

// ── Task completion thresholds ──────────────────────────────────

/** MCQ attempts needed before a chapter task is considered completed */
export const MCQ_COMPLETION_THRESHOLD = 10;

/** Coverage % at which a chapter task is considered completed */
export const COVERAGE_COMPLETION_THRESHOLD = 80;

/** Readiness score at which a chapter task is considered completed */
export const READINESS_COMPLETION_THRESHOLD = 60;

/** MCQ attempts threshold for partial progress */
export const PARTIAL_MCQ_THRESHOLD = 3;

// ── Carry-over rules ────────────────────────────────────────────

/** Maximum number of tasks carried from yesterday */
export const MAX_CARRY_OVER_TASKS = 2;

/** Minimum priority for a task to be eligible for carry-over */
export const CARRY_OVER_MIN_PRIORITY = 80;

/** Maximum times a task can be carried over (prevents infinite loops) */
export const MAX_CARRY_COUNT = 1;

// ── Priority system ─────────────────────────────────────────────

/** Hard cap on any single task priority after all multipliers */
export const PRIORITY_CAP = 200;

/** Minimum progress tasks to keep in plan unless exam < EXAM_CRITICAL_DAYS */
export const MIN_PROGRESS_TASKS_UNLESS_EXAM_CRITICAL = 1;

/** Exam-critical threshold in days — below this, progress tasks can be skipped */
export const EXAM_CRITICAL_DAYS = 3;

// ── Exam mode multipliers ───────────────────────────────────────

export type ExamMode = 'normal' | 'moderate' | 'intensive';

export interface ExamModeMultipliers {
  weakness: number;
  review: number;
  weightCap: number;
  progressBasePriority: number;
}

export const EXAM_MODE_MULTIPLIERS: Record<ExamMode, ExamModeMultipliers> = {
  normal: { weakness: 1.0, review: 1.0, weightCap: 2.0, progressBasePriority: 75 },
  moderate: { weakness: 1.3, review: 1.2, weightCap: 2.5, progressBasePriority: 60 },
  intensive: { weakness: 1.6, review: 1.5, weightCap: 3.0, progressBasePriority: 40 },
};

/** Classify exam mode from days until exam */
export function classifyExamMode(daysUntilExam: number | null): ExamMode {
  if (daysUntilExam === null || daysUntilExam > 30) return 'normal';
  if (daysUntilExam >= 8) return 'moderate';
  return 'intensive';
}

/** Compute days until an exam date (null if no date) */
export function getDaysUntilExam(examDate: Date | string | null | undefined): number | null {
  if (!examDate) return null;
  const target = typeof examDate === 'string' ? new Date(examDate) : examDate;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ── Ambition level multipliers ──────────────────────────────────

export type AmbitionLevel =
  | 'top_of_class'
  | 'above_average'
  | 'pass_comfortably'
  | 'just_pass';

export interface AmbitionMultipliers {
  /** Scales all task priorities up or down */
  priorityScale: number;
  /** Added to the normal maxTasks cap (can be negative) */
  maxTasksBonus: number;
}

export const AMBITION_MULTIPLIERS: Record<AmbitionLevel, AmbitionMultipliers> = {
  top_of_class:    { priorityScale: 1.15, maxTasksBonus:  1 },
  above_average:   { priorityScale: 1.05, maxTasksBonus:  0 },
  pass_comfortably:{ priorityScale: 1.0,  maxTasksBonus:  0 },
  just_pass:       { priorityScale: 0.85, maxTasksBonus: -1 },
};

/** Cap on available study minutes when the student is on clinical rotation */
export const ROTATION_MINUTES_CAP = 45;
