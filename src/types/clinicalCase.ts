// Clinical Case Types (Unified system for Case Scenarios, Virtual Patients, etc.)

export type CaseMode = 'read_case' | 'practice_case' | 'branched_case';
export type CaseStageType = 'mcq' | 'multi_select' | 'short_answer' | 'read_only';
export type CaseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CaseChoice {
  key: string;
  text: string;
}

// Rubric structure for short-answer marking
export interface CaseRubric {
  required_concepts: string[];
  optional_concepts: string[];
  pass_threshold?: number; // Default 0.6 (60%)
  acceptable_phrases?: Record<string, string[]>; // Concept -> synonyms mapping
  critical_omissions?: string[]; // Must be addressed or answer fails
}

// Result of rubric-based marking
export interface CaseRubricResult {
  is_correct: boolean;
  score: number; // 0-1
  matched_required: string[];
  missing_required: string[];
  matched_optional: string[];
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
  correct_answer: string | string[]; // Single key for MCQ, array for multi-select, text for short_answer/read_only
  explanation: string | null;
  teaching_points: string[];
  rubric: CaseRubric | null; // For short_answer grading
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
  rubric_result?: CaseRubricResult; // For short_answer stages
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
  rubric?: CaseRubric | null; // For short_answer grading
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
  { id: 'branched_case', label: 'Branched Cases', description: 'Cases with multiple pathways', comingSoon: true },
];
