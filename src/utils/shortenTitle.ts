/**
 * Intelligently shorten a chapter/topic title for mobile display.
 * Removes filler words, abbreviates common medical terms, and
 * truncates at word boundaries if still too long.
 */
export function shortenTitle(title: string, maxLen = 38): string {
  if (title.length <= maxLen) return title;

  let short = title
    // Common abbreviations
    .replace(/\band\b/gi, '&')
    .replace(/\bwith\b/gi, 'w/')
    .replace(/\bmanagement\b/gi, 'Mgmt')
    .replace(/\bassessment\b/gi, 'Assess.')
    .replace(/\bclassification\b/gi, 'Classif.')
    .replace(/\bprinciples\b/gi, 'Princ.')
    .replace(/\btransplantation\b/gi, 'Transplant.')
    .replace(/\bperioperative\b/gi, 'Periop.')
    .replace(/\bresuscitation\b/gi, 'Resus.')
    .replace(/\bemergency\b/gi, 'Emerg.')
    .replace(/\bmultiple-injury\b/gi, 'multi-injury')
    .replace(/\btransfusion\b/gi, 'Transfus.')
    .replace(/\bhemorrhage\b/gi, 'Hemorrh.')
    .replace(/\bsurgical\b/gi, 'Surg.')
    .replace(/\bnutrition\b/gi, 'Nutri.')
    // Remove articles
    .replace(/\bthe\b/gi, '')
    .replace(/\ba\b(?=\s)/gi, '')
    // Clean up extra spaces
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (short.length <= maxLen) return short;

  // Truncate at last word boundary
  const truncated = short.substring(0, maxLen).replace(/\s+\S*$/, '');
  return truncated + '…';
}
