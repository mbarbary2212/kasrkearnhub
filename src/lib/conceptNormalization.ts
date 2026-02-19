/**
 * Normalize a string into a valid concept_key.
 * Rules: lowercase, trim, & → and, remove punctuation, spaces/dashes → _, collapse underscores, max 64 chars.
 */
export function normalizeConceptKey(text: string): string {
  let key = text.trim().toLowerCase();
  key = key.replace(/&/g, 'and');
  key = key.replace(/[^\w\s-]/g, ''); // remove punctuation except underscores, word chars, spaces, dashes
  key = key.replace(/[\s-]+/g, '_');   // spaces and dashes → underscore
  key = key.replace(/_+/g, '_');       // collapse multiple underscores
  key = key.replace(/^_|_$/g, '');     // trim leading/trailing underscores
  return key.slice(0, 64);
}
