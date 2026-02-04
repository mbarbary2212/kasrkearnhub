/**
 * Zod validation schemas for MCQ and Essay data
 * Protects academic integrity by blocking invalid questions BEFORE they reach students
 */

import { z } from 'zod';

// =====================
// MCQ Validation Schema
// =====================

export const McqChoiceSchema = z.object({
  key: z.enum(['A', 'B', 'C', 'D', 'E'], {
    errorMap: () => ({ message: 'Choice key must be A, B, C, D, or E' }),
  }),
  text: z.string()
    .min(1, 'Choice text cannot be empty')
    .max(1000, 'Choice text is too long (max 1000 characters)'),
});

export const McqFormSchema = z.object({
  stem: z.string()
    .min(10, 'Question must be at least 10 characters')
    .max(5000, 'Question is too long (max 5000 characters)'),
  
  choices: z.array(McqChoiceSchema)
    .min(4, 'MCQ must have at least 4 choices (A-D)')
    .max(5, 'MCQ can have at most 5 choices (A-E)')
    .refine(
      (choices) => {
        const keys = choices.map(c => c.key);
        return new Set(keys).size === keys.length;
      },
      { message: 'Each choice must have a unique key' }
    ),
  
  correct_key: z.enum(['A', 'B', 'C', 'D', 'E'], {
    errorMap: () => ({ message: 'Correct answer must be A, B, C, D, or E' }),
  }),
  
  explanation: z.string()
    .max(2000, 'Explanation is too long (max 2000 characters)')
    .nullable()
    .optional(),
  
  difficulty: z.enum(['easy', 'medium', 'hard'])
    .nullable()
    .optional(),
})
.refine(
  (data) => data.choices.some(c => c.key === data.correct_key),
  {
    message: 'Correct answer must match one of the choice keys',
    path: ['correct_key'],
  }
);

// =====================
// Essay Validation Schema
// =====================

export const EssayFormSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title is too long (max 200 characters)'),
  
  question: z.string()
    .min(10, 'Question must be at least 10 characters')
    .max(3000, 'Question is too long (max 3000 characters)'),
  
  model_answer: z.string()
    .max(5000, 'Model answer is too long (max 5000 characters)')
    .nullable()
    .optional(),
});

// =====================
// Batch Validation Helper
// =====================

export interface BatchValidationResult<T> {
  valid: T[];
  invalid: Array<{ 
    index: number; 
    row: number;  // 1-indexed for display
    errors: string[]; 
  }>;
  stats: {
    total: number;
    validCount: number;
    invalidCount: number;
  };
}

export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
  headerOffset: number = 1
): BatchValidationResult<T> {
  const valid: T[] = [];
  const invalid: BatchValidationResult<T>['invalid'] = [];
  
  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        index,
        row: index + headerOffset + 1, // +1 for header, +1 for 1-indexing
        errors: result.error.errors.map(
          e => `${e.path.length ? e.path.join('.') + ': ' : ''}${e.message}`
        ),
      });
    }
  });
  
  return { 
    valid, 
    invalid,
    stats: {
      total: items.length,
      validCount: valid.length,
      invalidCount: invalid.length,
    }
  };
}

// =====================
// True/False Validation Schema
// =====================

export const TrueFalseFormSchema = z.object({
  statement: z.string()
    .min(10, 'Statement must be at least 10 characters')
    .max(3000, 'Statement is too long (max 3000 characters)'),
  correct_answer: z.boolean(),
  explanation: z.string()
    .max(2000, 'Explanation is too long (max 2000 characters)')
    .nullable()
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'])
    .nullable()
    .optional(),
});

export type ValidatedMcq = z.infer<typeof McqFormSchema>;
export type ValidatedEssay = z.infer<typeof EssayFormSchema>;
export type ValidatedTrueFalse = z.infer<typeof TrueFalseFormSchema>;
