/**
 * Centralized content type label map.
 * Use this everywhere in the UI to ensure consistent naming.
 * Internal DB keys remain unchanged (e.g., 'essay').
 */

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  essay: 'Short Questions',
  essays: 'Short Questions',
  short_essay: 'Short Questions',
  short_answer: 'Short Questions',
  mcq: 'MCQ',
  sba: 'SBA',
  osce: 'OSCE',
  true_false: 'True/False',
  matching: 'Matching',
  flashcard: 'Flashcards',
  clinical_case: 'Clinical Cases',
  case_scenario: 'Case Scenarios',
  practical: 'Practical',
  lecture: 'Lecture',
  resource: 'Resource',
  pathway: 'Pathway',
  mind_map: 'Mind Map',
};

/**
 * Get the display label for a content type.
 * Falls back to the raw key with first letter capitalized if not found.
 */
export function getContentLabel(type: string): string {
  return CONTENT_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}
