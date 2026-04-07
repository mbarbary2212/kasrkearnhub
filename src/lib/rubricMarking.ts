// Rubric-based marking for short-answer questions
import { VPRubric, VPRubricResult } from '@/types/virtualPatient';
import { StructuredRubric, parseRubric, type GradingResult } from '@/types/essayRubric';

export { parseRubric, getExpectedPoints } from '@/types/essayRubric';
export type { StructuredRubric, GradingResult } from '@/types/essayRubric';

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
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy matching with minor spelling differences.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if a concept is present in the answer.
 * Uses fuzzy matching for minor spelling differences.
 * Also checks acceptable phrases/synonyms if provided.
 */
function conceptPresent(
  answer: string, 
  concept: string, 
  acceptablePhrases?: Record<string, string[]>
): boolean {
  const normalizedAnswer = normalizeText(answer);
  const normalizedConcept = normalizeText(concept);
  
  // Exact match
  if (normalizedAnswer.includes(normalizedConcept)) {
    return true;
  }
  
  // Check synonyms from acceptable phrases
  if (acceptablePhrases) {
    const synonyms = acceptablePhrases[concept.toLowerCase()] || 
                     acceptablePhrases[normalizedConcept];
    if (synonyms) {
      for (const synonym of synonyms) {
        const normalizedSynonym = normalizeText(synonym);
        if (normalizedAnswer.includes(normalizedSynonym)) {
          return true;
        }
      }
    }
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
  
  // Fuzzy matching for single words or short phrases (Levenshtein)
  const answerWords = normalizedAnswer.split(' ');
  for (const answerWord of answerWords) {
    // Only apply fuzzy matching for words > 5 chars
    if (answerWord.length > 5 && normalizedConcept.length > 5) {
      // Allow Levenshtein distance <= 1 for longer words
      if (levenshteinDistance(answerWord, normalizedConcept) <= 1) {
        return true;
      }
    }
    
    // Also check if answer word is close enough to concept
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
 * Check if critical omissions are addressed in the answer.
 * Returns true if all critical omissions are mentioned.
 */
function criticalOmissionsAddressed(
  answer: string,
  criticalOmissions: string[],
  acceptablePhrases?: Record<string, string[]>
): boolean {
  for (const omission of criticalOmissions) {
    if (!conceptPresent(answer, omission, acceptablePhrases)) {
      return false;
    }
  }
  return true;
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
  const acceptablePhrases = rubric.acceptable_phrases;
  
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const matchedOptional: string[] = [];
  
  // Check required concepts
  for (const concept of rubric.required_concepts) {
    if (conceptPresent(answer, concept, acceptablePhrases)) {
      matchedRequired.push(concept);
    } else {
      missingRequired.push(concept);
    }
  }
  
  // Check optional concepts
  for (const concept of rubric.optional_concepts) {
    if (conceptPresent(answer, concept, acceptablePhrases)) {
      matchedOptional.push(concept);
    }
  }
  
  // Calculate score based on required concepts only
  const requiredCount = rubric.required_concepts.length;
  const score = requiredCount > 0 ? matchedRequired.length / requiredCount : 0;
  
  // Check critical omissions
  let passedCritical = true;
  if (rubric.critical_omissions && rubric.critical_omissions.length > 0) {
    passedCritical = criticalOmissionsAddressed(answer, rubric.critical_omissions, acceptablePhrases);
  }
  
  // Pass if score >= threshold AND critical omissions are addressed
  const is_correct = score >= threshold && passedCritical;
  
  return {
    is_correct,
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

/**
 * Grade a short-answer response against a StructuredRubric (new format).
 * Used as a local fallback when AI grading is unavailable.
 */
export function gradeWithStructuredRubric(
  answer: string,
  rubric: StructuredRubric,
): GradingResult {
  const acceptablePhrases = rubric.acceptable_phrases || {};
  const matchedPoints: string[] = [];
  const missedPoints: string[] = [];
  const missingCritical: string[] = [];

  for (const concept of rubric.required_concepts) {
    // Build a per-concept synonym lookup
    const synonyms = concept.acceptable_phrases || [];
    const phraseLookup: Record<string, string[]> = {};
    if (synonyms.length) phraseLookup[concept.label.toLowerCase()] = synonyms;
    // Also merge global acceptable phrases
    Object.assign(phraseLookup, acceptablePhrases);

    if (conceptPresent(answer, concept.label, phraseLookup)) {
      matchedPoints.push(concept.label);
    } else {
      missedPoints.push(concept.label);
      if (concept.is_critical) {
        missingCritical.push(concept.label);
      }
    }
  }

  const maxScore = rubric.required_concepts.length;
  const score = matchedPoints.length;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score,
    max_score: maxScore,
    percentage,
    matched_points: matchedPoints,
    missed_points: missedPoints,
    missing_critical_points: missingCritical,
    confidence_score: maxScore > 0 ? score / maxScore : 0,
    feedback: missingCritical.length > 0
      ? `Critical points missed: ${missingCritical.join(', ')}`
      : missedPoints.length > 0
        ? `Good attempt. Missing: ${missedPoints.join(', ')}`
        : 'Excellent — all key points covered!',
  };
}
