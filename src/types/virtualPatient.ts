// Virtual Patient Types — Simplified: All cases are AI-driven

export type VPLevel = 'beginner' | 'intermediate' | 'advanced';

// Re-exported rubric types for backward compat
export interface VPRubric {
  required_concepts: string[];
  optional_concepts: string[];
  pass_threshold?: number;
  acceptable_phrases?: Record<string, string[]>;
  critical_omissions?: string[];
}

export interface VPRubricResult {
  is_correct: boolean;
  score: number;
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
  is_ai_driven: boolean;
  learning_objectives: string | null;
  max_turns: number;
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
  stage_answers: Record<string, unknown>;
  is_completed: boolean;
  created_at: string;
  // Joined data
  case?: VPCase;
}

// Form types for admin
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
  learning_objectives?: string;
  max_turns?: number;
}
