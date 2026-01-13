// Rubric-based marking for short-answer questions
import { VPRubric, VPRubricResult } from '@/types/virtualPatient';

const DEFAULT_PASS_THRESHOLD = 0.6; // 60%

/**
 * Normalize text for comparison:
 * - Lowercase
 * - Remove punctuation
 * - Trim whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?'"()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a concept is present in the answer.
 * Uses fuzzy matching for minor spelling differences.
 */
function conceptPresent(answer: string, concept: string): boolean {
  const normalizedAnswer = normalizeText(answer);
  const normalizedConcept = normalizeText(concept);
  
  // Exact match
  if (normalizedAnswer.includes(normalizedConcept)) {
    return true;
  }
  
  // Word-by-word check for multi-word concepts
  const conceptWords = normalizedConcept.split(' ').filter(w => w.length > 2);
  if (conceptWords.length > 1) {
    // If most words are present, consider it a match
    const matchedWords = conceptWords.filter(word => normalizedAnswer.includes(word));
    if (matchedWords.length >= Math.ceil(conceptWords.length * 0.7)) {
      return true;
    }
  }
  
  // Fuzzy matching for single words or short phrases (Levenshtein-ish)
  const answerWords = normalizedAnswer.split(' ');
  for (const answerWord of answerWords) {
    if (answerWord.length >= 4 && normalizedConcept.length >= 4) {
      // Check if one contains most of the other
      if (answerWord.includes(normalizedConcept.slice(0, -1)) || 
          normalizedConcept.includes(answerWord.slice(0, -1))) {
        return true;
      }
      // Simple edit distance check for minor typos (1-2 character difference)
      if (Math.abs(answerWord.length - normalizedConcept.length) <= 2) {
        let matches = 0;
        const shorter = answerWord.length < normalizedConcept.length ? answerWord : normalizedConcept;
        const longer = answerWord.length >= normalizedConcept.length ? answerWord : normalizedConcept;
        for (let i = 0; i < shorter.length; i++) {
          if (longer.includes(shorter[i])) matches++;
        }
        if (matches >= shorter.length * 0.8) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Grade a short-answer response against a rubric.
 * Returns detailed feedback on which concepts were matched/missing.
 */
export function gradeWithRubric(
  answer: string,
  rubric: VPRubric
): VPRubricResult {
  const threshold = rubric.pass_threshold ?? DEFAULT_PASS_THRESHOLD;
  
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const matchedOptional: string[] = [];
  
  // Check required concepts
  for (const concept of rubric.required_concepts) {
    if (conceptPresent(answer, concept)) {
      matchedRequired.push(concept);
    } else {
      missingRequired.push(concept);
    }
  }
  
  // Check optional concepts
  for (const concept of rubric.optional_concepts) {
    if (conceptPresent(answer, concept)) {
      matchedOptional.push(concept);
    }
  }
  
  // Calculate score based on required concepts only
  const requiredCount = rubric.required_concepts.length;
  const score = requiredCount > 0 ? matchedRequired.length / requiredCount : 0;
  
  return {
    is_correct: score >= threshold,
    score,
    matched_required: matchedRequired,
    missing_required: missingRequired,
    matched_optional: matchedOptional,
  };
}

/**
 * Simple exact match fallback for short answers without rubric.
 * This is the legacy behavior.
 */
export function gradeExactMatch(answer: string, correctAnswer: string): boolean {
  return normalizeText(answer) === normalizeText(correctAnswer);
}

/**
 * Parse comma-separated or bullet-pointed concepts into an array.
 * Used for parsing admin input in the rubric editor.
 */
export function parseConcepts(text: string): string[] {
  if (!text.trim()) return [];
  
  // Split by newlines, commas, or bullet points
  return text
    .split(/[\n,]|(?:^|\n)\s*[-•*]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Format concepts array for display (comma-separated).
 */
export function formatConcepts(concepts: string[]): string {
  return concepts.join(', ');
}
