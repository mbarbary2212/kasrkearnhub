// Database types matching Supabase schema
export type AppRole = 'student' | 'teacher' | 'admin' | 'department_admin' | 'platform_admin' | 'super_admin';
export type DepartmentCategory = 'basic' | 'clinical';
export type ContentType = 'lecture' | 'resource' | 'mcq' | 'essay' | 'practical';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface DepartmentAdmin {
  id: string;
  user_id: string;
  department_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface FeedbackTopic {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  department_id: string | null;
  topic_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StudentFeedback {
  id: string;
  feedback_topic_id: string;
  department_id: string;
  topic_id: string | null;
  content_quality: number | null;
  teaching_effectiveness: number | null;
  resource_availability: number | null;
  overall_satisfaction: number | null;
  comments: string | null;
  suggestions: string | null;
  academic_year: number | null;
  created_at: string;
}

export interface FeedbackAggregate {
  department_id: string;
  topic_id: string | null;
  feedback_topic_id: string;
  response_count: number;
  avg_content_quality: number | null;
  avg_teaching_effectiveness: number | null;
  avg_resource_availability: number | null;
  avg_overall_satisfaction: number | null;
  period: string;
}

export interface Department {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  icon: string;
  years: number[];
  category: DepartmentCategory;
  display_order: number;
  created_at: string;
}

export interface Topic {
  id: string;
  department_id: string;
  module_id: string | null;
  slug: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface Lecture {
  id: string;
  topic_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  video_url: string | null;
  duration: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  topic_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  resource_type: string;
  file_url: string | null;
  external_url: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export interface McqSet {
  id: string;
  topic_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  time_limit_minutes: number | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export interface McqQuestion {
  id: string;
  mcq_set_id: string;
  question: string;
  question_ar: string | null;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  explanation_ar: string | null;
  display_order: number;
  created_at: string;
}

export interface Essay {
  id: string;
  topic_id: string;
  title: string;
  title_ar: string | null;
  question: string;
  question_ar: string | null;
  model_answer: string | null;
  model_answer_ar: string | null;
  keywords: string[] | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export interface Practical {
  id: string;
  topic_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  objectives: string[] | null;
  equipment: string[] | null;
  procedure: string | null;
  procedure_ar: string | null;
  video_url: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export interface ClinicalCase {
  id: string;
  topic_id: string;
  title: string;
  title_ar: string | null;
  presentation: string;
  history: string | null;
  examination: string | null;
  investigations: string | null;
  differential_diagnosis: string[] | null;
  final_diagnosis: string | null;
  management: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;
  completed: boolean;
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface McqAttempt {
  id: string;
  user_id: string;
  mcq_set_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, number> | null;
  completed_at: string;
}
