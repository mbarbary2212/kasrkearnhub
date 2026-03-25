/**
 * Cross-module virtual book mappings.
 * When a module "borrows" content from another module's book, map:
 *   targetModuleId → { targetBookLabel → { sourceModuleId, sourceBookLabel } }
 *
 * SUR-523's "General" tab shows chapters from SUR-423's "General surgery Book 1".
 */
export interface CrossModuleBookMapping {
  sourceModuleId: string;
  sourceBookLabel: string;
}

export const CROSS_MODULE_BOOKS: Record<string, Record<string, CrossModuleBookMapping>> = {
  '7f5167dd-b746-4ac6-94f3-109d637df861': {
    'General': {
      sourceModuleId: '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10',
      sourceBookLabel: 'General surgery Book 1',
    },
  },
};

/**
 * Resolve the actual module ID and book label to fetch chapters from.
 * If the book is cross-mapped, returns source info; otherwise returns the original.
 */
export function resolveCrossModuleBook(
  moduleId: string,
  bookLabel: string
): { fetchModuleId: string; fetchBookLabel: string } {
  const mapping = CROSS_MODULE_BOOKS[moduleId]?.[bookLabel];
  if (mapping) {
    return {
      fetchModuleId: mapping.sourceModuleId,
      fetchBookLabel: mapping.sourceBookLabel,
    };
  }
  return { fetchModuleId: moduleId, fetchBookLabel: bookLabel };
}
