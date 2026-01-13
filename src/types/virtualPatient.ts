// Virtual Patient Types

export type VPStageType = 'mcq' | 'multi_select' | 'short_answer';
export type VPLevel = 'beginner' | 'intermediate' | 'advanced';

export interface VPChoice {
  key: string;
  text: string;
}

// Rubric structure for short-answer marking
export interface VPRubric {
  required_concepts: string[];
  optional_concepts: string[];
  pass_threshold?: number; // Default 0.6 (60%)
  acceptable_phrases?: Record<string, string[]>; // Concept -> synonyms mapping
  critical_omissions?: string[]; // Must be addressed or answer fails
}

// Result of rubric-based marking
export interface VPRubricResult {
  is_correct: boolean;
  score: number; // 0-1
  matched_required: string[];
  missing_required: string[];
  matched_optional: string[];
}

export interface VPCase {
  id: string;
  title: string;
  intro_text: string;
  module_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  level: VPLevel;
  estimated_minutes: number;
  tags: string[];
  is_published: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  module?: { name: string } | null;
  chapter?: { title: string; chapter_number: number } | null;
  topic?: { name: string } | null;
  stages?: VPStage[];
  stage_count?: number;
}

export interface VPStage {
  id: string;
  case_id: string;
  stage_order: number;
  stage_type: VPStageType;
  prompt: string;
  patient_info: string | null;
  choices: VPChoice[];
  correct_answer: string | string[]; // Single key for MCQ, array for multi-select, text for short_answer
  explanation: string | null;
  teaching_points: string[];
  rubric: VPRubric | null; // For short_answer grading
  created_at: string;
  updated_at: string;
}

export interface VPAttempt {
  id: string;
  user_id: string;
  case_id: string;
  started_at: string;
  completed_at: string | null;
  time_taken_seconds: number | null;
  total_stages: number;
  correct_count: number;
  score: number;
  stage_answers: Record<string, StageAnswer>;
  is_completed: boolean;
  created_at: string;
  // Joined data
  case?: VPCase;
}

export interface StageAnswer {
  stage_id: string;
  user_answer: string | string[];
  is_correct: boolean;
  time_taken_seconds?: number;
  rubric_result?: VPRubricResult; // For short_answer stages
}

// Form types for admin builder
export interface VPCaseFormData {
  title: string;
  intro_text: string;
  module_id: string;
  chapter_id?: string;
  topic_id?: string;
  level: VPLevel;
  estimated_minutes: number;
  tags: string[];
  is_published: boolean;
}

export interface VPStageFormData {
  stage_order: number;
  stage_type: VPStageType;
  prompt: string;
  patient_info?: string;
  choices: VPChoice[];
  correct_answer: string | string[];
  explanation?: string;
  teaching_points: string[];
  rubric?: VPRubric | null; // For short_answer grading
}
