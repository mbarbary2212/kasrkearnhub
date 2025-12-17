// User and Auth Types
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

// Academic Structure Types
export interface Department {
  id: string;
  name: string;
  description: string;
  icon: string;
  years: number[]; // Which years this department appears in
  category: 'basic' | 'clinical';
}

export interface Topic {
  id: string;
  departmentId: string;
  name: string;
  description: string;
  order: number;
}

// Content Types
export interface VideoLesson {
  id: string;
  topicId: string;
  title: string;
  description: string;
  videoUrl: string; // YouTube or Vimeo URL
  duration: string;
  order: number;
}

export interface Quiz {
  id: string;
  topicId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ClinicalCase {
  id: string;
  topicId: string;
  title: string;
  presentation: string;
  history: string;
  examination: string;
  investigations: string;
  differentialDiagnosis: string[];
  finalDiagnosis: string;
  management: string;
}

// Progress Types
export interface UserProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}

export interface QuizAttempt {
  quizId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}
