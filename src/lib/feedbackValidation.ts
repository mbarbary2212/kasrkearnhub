import { z } from 'zod';

// Minimum and maximum message length for feedback/inquiry
export const FEEDBACK_MIN_LENGTH = 10;
export const FEEDBACK_MAX_LENGTH = 1500;
export const SUBJECT_MIN_LENGTH = 3;
export const SUBJECT_MAX_LENGTH = 150;

// Rate limiting constants
export const MAX_SUBMISSIONS_PER_HOUR = 5;

// HTML tag detection regex
const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Strips HTML tags from input and trims whitespace
 */
export function sanitizeTextInput(input: string): string {
  return input
    .replace(HTML_TAG_REGEX, '') // Remove HTML tags
    .trim();
}

/**
 * Validates feedback/inquiry message
 */
export const feedbackMessageSchema = z
  .string()
  .transform(sanitizeTextInput)
  .refine((val) => val.length >= FEEDBACK_MIN_LENGTH, {
    message: `Message must be at least ${FEEDBACK_MIN_LENGTH} characters`,
  })
  .refine((val) => val.length <= FEEDBACK_MAX_LENGTH, {
    message: `Message must be less than ${FEEDBACK_MAX_LENGTH} characters`,
  });

/**
 * Validates inquiry subject
 */
export const subjectSchema = z
  .string()
  .transform(sanitizeTextInput)
  .refine((val) => val.length >= SUBJECT_MIN_LENGTH, {
    message: `Subject must be at least ${SUBJECT_MIN_LENGTH} characters`,
  })
  .refine((val) => val.length <= SUBJECT_MAX_LENGTH, {
    message: `Subject must be less than ${SUBJECT_MAX_LENGTH} characters`,
  });

/**
 * Maps legacy inquiry category values to display labels
 */
export const INQUIRY_CATEGORY_DISPLAY: Record<string, string> = {
  // New categories
  study_material: 'Study material / lecture content',
  mcq_explanation: 'MCQ or question explanation',
  exam_assessment: 'Exam and assessment related',
  syllabus_objectives: 'Syllabus and learning objectives',
  technical: 'Technical issue',
  suggestion: 'Suggestion / feedback',
  other: 'Other',
  // Legacy mappings
  content: 'Study material / lecture content',
  general: 'Other',
  account: 'Technical issue',
  content_question: 'Study material / lecture content',
  general_question: 'Other',
  technical_issue: 'Technical issue',
};

/**
 * Gets display label for an inquiry category (handles legacy values)
 */
export function getInquiryCategoryLabel(category: string): string {
  return INQUIRY_CATEGORY_DISPLAY[category] || category;
}

/**
 * Validates and sanitizes feedback submission data
 */
export function validateFeedbackMessage(message: string): { 
  success: boolean; 
  data?: string; 
  error?: string 
} {
  const result = feedbackMessageSchema.safeParse(message);
  if (!result.success) {
    return { 
      success: false, 
      error: result.error.errors[0]?.message || 'Invalid message' 
    };
  }
  return { success: true, data: result.data };
}

/**
 * Validates and sanitizes inquiry subject
 */
export function validateSubject(subject: string): { 
  success: boolean; 
  data?: string; 
  error?: string 
} {
  const result = subjectSchema.safeParse(subject);
  if (!result.success) {
    return { 
      success: false, 
      error: result.error.errors[0]?.message || 'Invalid subject' 
    };
  }
  return { success: true, data: result.data };
}
