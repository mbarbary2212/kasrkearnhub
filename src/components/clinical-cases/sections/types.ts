// Shared types for all section runner components
import { SectionType } from '@/types/structuredCase';

export interface SectionComponentProps<T = any> {
  data: T;
  onSubmit: (answer: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
  previousAnswer?: Record<string, unknown> | null;
}

export interface SectionResult {
  sectionType: SectionType;
  studentAnswer: Record<string, unknown>;
}
