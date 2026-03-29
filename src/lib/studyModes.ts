/**
 * Shared study-mode mapping utility.
 * Used by dashboard, planner, and future coach layer.
 * Single source of truth for exam component → study mode.
 */

export type ExamComponentType =
  | 'mcq'
  | 'short_answer_recall'
  | 'short_answer_case'
  | 'osce'
  | 'long_case'
  | 'short_case'
  | 'paraclinical';

export interface StudyMode {
  /** Stable key for programmatic use */
  key: string;
  /** Human-readable label for UI */
  label: string;
  /** Navigation tab target */
  tab: string;
}

export const STUDY_MODE_MAP: Record<ExamComponentType, StudyMode> = {
  mcq: { key: 'mcq_practice', label: 'MCQ Practice', tab: 'practice' },
  short_answer_recall: { key: 'recall_practice', label: 'Recall Practice', tab: 'practice' },
  short_answer_case: { key: 'case_scenarios', label: 'Case Scenarios', tab: 'cases' },
  osce: { key: 'clinical_practice', label: 'Clinical Practice', tab: 'cases' },
  long_case: { key: 'clinical_practice', label: 'Clinical Practice', tab: 'cases' },
  short_case: { key: 'clinical_practice', label: 'Clinical Practice', tab: 'cases' },
  paraclinical: { key: 'visual_practice', label: 'Visual Practice', tab: 'visuals' },
};

const DEFAULT_STUDY_MODE: StudyMode = { key: 'review', label: 'Review', tab: 'resources' };

/**
 * Returns the study mode for a given exam component type.
 * Falls back to generic "Review" if the type is unknown or undefined.
 */
export function getStudyMode(componentType: string | undefined | null): StudyMode {
  if (!componentType) return DEFAULT_STUDY_MODE;
  return STUDY_MODE_MAP[componentType as ExamComponentType] ?? DEFAULT_STUDY_MODE;
}
