// Clinical Case Types — Simplified: All cases are AI-driven OSCE simulations

export type CaseLevel = 'beginner' | 'intermediate' | 'advanced';

// Re-exported rubric types for backward compat (used by exam/rubricMarking)
export interface CaseRubric {
  required_concepts: string[];
  optional_concepts: string[];
  pass_threshold?: number;
  acceptable_phrases?: Record<string, string[]>;
  critical_omissions?: string[];
}

export interface CaseRubricResult {
  is_correct: boolean;
  score: number;
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
  level: CaseLevel;
  estimated_minutes: number;
  tags: string[];
  is_published: boolean;
  is_deleted: boolean;
  is_ai_driven: boolean;
  learning_objectives: string | null;
  max_turns: number;
  // Patient demographics (for avatar feature)
  patient_name: string | null;
  patient_age: number | null;
  patient_gender: 'male' | 'female' | 'other' | null;
  patient_image_url: string | null;
  // Metadata
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  module?: { name: string } | null;
  chapter?: { title: string; chapter_number: number } | null;
  topic?: { name: string } | null;
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
  stage_answers: Record<string, unknown>;
  is_completed: boolean;
  created_at: string;
  // Joined data
  case?: ClinicalCase;
}

// Form types for admin
export interface ClinicalCaseFormData {
  title: string;
  intro_text: string;
  module_id: string;
  chapter_id?: string;
  topic_id?: string;
  section_id?: string;
  level: CaseLevel;
  estimated_minutes: number;
  tags: string[];
  is_published: boolean;
  learning_objectives?: string;
  max_turns?: number;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: 'male' | 'female' | 'other';
  patient_image_url?: string;
}
