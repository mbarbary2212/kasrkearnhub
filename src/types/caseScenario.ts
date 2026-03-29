// Case Scenario types — structured exam case content type

export type CaseDifficulty = 'easy' | 'moderate' | 'difficult';
export type CaseQuestionType = 'short_answer' | 'single_best_answer';

export interface CaseScenario {
  id: string;
  chapter_id: string | null;
  topic_id: string | null;
  module_id: string | null;
  difficulty: CaseDifficulty;
  stem: string;
  tags: string[];
  is_deleted: boolean;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  questions?: CaseScenarioQuestion[];
  chapter?: { title: string; chapter_number: number } | null;
  topic?: { name: string } | null;
  module?: { name: string } | null;
}

export interface CaseScenarioQuestion {
  id: string;
  case_id: string;
  question_text: string;
  question_type: CaseQuestionType;
  model_answer: string | null;
  explanation: string | null;
  max_marks: number;
  display_order: number;
  created_at: string;
}

export interface CaseScenarioFormData {
  chapter_id?: string;
  topic_id?: string;
  module_id?: string;
  difficulty: CaseDifficulty;
  stem: string;
  tags: string[];
  questions: {
    question_text: string;
    question_type: CaseQuestionType;
    model_answer?: string;
    explanation?: string;
    max_marks: number;
  }[];
}
