// Clinical Case Types (Unified system for Case Scenarios, Virtual Patients, etc.)

export type CaseMode = 'read_case' | 'practice_case' | 'branched_case';
export type CaseStageType = 'mcq' | 'multi_select' | 'short_answer' | 'read_only';
export type CaseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CaseType = 'basic' | 'advanced';
export type FeedbackTiming = 'immediate' | 'deferred';

export interface CaseChoice {
  key: string;
  text: string;
}

// Rubric structure for short-answer marking
export interface CaseRubric {
  required_concepts: string[];
  optional_concepts: string[];
  pass_threshold?: number;
  acceptable_phrases?: Record<string, string[]>;
  critical_omissions?: string[];
}

// Result of rubric-based marking
export interface CaseRubricResult {
  is_correct: boolean;
  score: number;
  matched_required: string[];
  missing_required: string[];
  matched_optional: string[];
}

// Patient state engine types
export interface PatientState {
  time_elapsed_minutes: number;
  hemodynamics: {
    heart_rate?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    respiratory_rate?: number;
    spo2?: number;
    temperature?: number;
    [key: string]: number | undefined;
  };
  risk_flags: string[];
  [key: string]: unknown;
}

export interface ClinicalCase {
  id: string;
  title: string;
  intro_text: string;
  module_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  section_id: string | null;
  case_mode: CaseMode;
  case_type: CaseType;
  feedback_timing: FeedbackTiming;
  status_panel_enabled: boolean;
  initial_state_json: PatientState | null;
  level: CaseLevel;
  estimated_minutes: number;
  tags: string[];
  is_published: boolean;
  is_deleted: boolean;
  // Patient demographics (for avatar feature)
  patient_name: string | null;
  patient_age: number | null;
  patient_gender: 'male' | 'female' | 'other' | null;
  patient_image_url: string | null;
  // Legacy migration tracking
  legacy_case_scenario_id: string | null;
  // Metadata
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  module?: { name: string } | null;
  chapter?: { title: string; chapter_number: number } | null;
  topic?: { name: string } | null;
  stages?: ClinicalCaseStage[];
  stage_count?: number;
}

export interface ClinicalCaseStage {
  id: string;
  case_id: string;
  stage_order: number;
  stage_type: CaseStageType;
  prompt: string;
  patient_info: string | null;
  choices: CaseChoice[];
  correct_answer: string | string[];
  explanation: string | null;
  teaching_points: string[];
  rubric: CaseRubric | null;
  consequence_text: string | null;
  state_delta_json: Partial<PatientState> | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalCaseAttempt {
  id: string;
  user_id: string;
  case_id: string;
  started_at: string;
  completed_at: string | null;
  time_taken_seconds: number | null;
  total_stages: number;
  correct_count: number;
  score: number;
  stage_answers: Record<string, CaseStageAnswer>;
  is_completed: boolean;
  created_at: string;
  // Joined data
  case?: ClinicalCase;
}

export interface CaseStageAnswer {
  stage_id: string;
  user_answer: string | string[];
  is_correct: boolean;
  time_taken_seconds?: number;
  rubric_result?: CaseRubricResult;
}

// Form types for admin builder
export interface ClinicalCaseFormData {
  title: string;
  intro_text: string;
  module_id: string;
  chapter_id?: string;
  topic_id?: string;
  section_id?: string;
  case_mode: CaseMode;
  case_type?: CaseType;
  feedback_timing?: FeedbackTiming;
  status_panel_enabled?: boolean;
  initial_state_json?: PatientState | null;
  level: CaseLevel;
  estimated_minutes: number;
  tags: string[];
  is_published: boolean;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: 'male' | 'female' | 'other';
  patient_image_url?: string;
}

export interface ClinicalCaseStageFormData {
  stage_order: number;
  stage_type: CaseStageType;
  prompt: string;
  patient_info?: string;
  choices: CaseChoice[];
  correct_answer: string | string[];
  explanation?: string;
  teaching_points: string[];
  rubric?: CaseRubric | null;
  consequence_text?: string;
  state_delta_json?: Partial<PatientState> | null;
}

// Mode tab configuration
export interface CaseModeTab {
  id: CaseMode | 'all';
  label: string;
  description?: string;
  comingSoon?: boolean;
}

export const CASE_MODE_TABS: CaseModeTab[] = [
  { id: 'all', label: 'All Cases' },
  { id: 'read_case', label: 'Read Cases', description: 'Review clinical scenarios with model answers' },
  { id: 'practice_case', label: 'Practice Cases', description: 'Interactive multi-stage clinical simulations' },
  { id: 'branched_case', label: 'Branched Cases', description: 'Cases with multiple pathways' },
];

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
};

// Helper: determines whether correctness should be shown immediately
// Default: basic=immediate, advanced=deferred. feedback_timing overrides if set.
export function shouldShowImmediateFeedback(caseType: CaseType, feedbackTiming?: FeedbackTiming): boolean {
  if (feedbackTiming === 'immediate') return true;
  if (feedbackTiming === 'deferred') return false;
  return caseType === 'basic';
}
