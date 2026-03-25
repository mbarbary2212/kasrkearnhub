/**
 * Cross-module virtual book mappings.
 * When a module "borrows" a book from another module, map:
 *   targetModuleId → { bookLabel → sourceModuleId }
 *
 * SUR-523 shows "General surgery Book 1" from SUR-423.
 */
export const CROSS_MODULE_BOOKS: Record<string, Record<string, string>> = {
  '7f5167dd-b746-4ac6-94f3-109d637df861': {
    'General surgery Book 1': '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10',
  },
};
