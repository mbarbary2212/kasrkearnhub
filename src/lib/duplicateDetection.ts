// Text similarity utilities for duplicate detection

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
export function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  
  if (normalizedA === normalizedB) return 1;
  
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(normalizedA, normalizedB);
  return 1 - distance / maxLength;
}

/**
 * Normalize text for comparison (lowercase, trim, remove extra whitespace)
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two texts are exact duplicates
 */
export function isExactDuplicate(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

/**
 * Check if two MCQs are duplicates
 */
export function isMcqDuplicate(
  mcq1: { stem: string; choices: { key: string; text: string }[] },
  mcq2: { stem: string; choices: { key: string; text: string }[] }
): { isExact: boolean; similarity: number } {
  const stem1 = normalizeText(mcq1.stem);
  const stem2 = normalizeText(mcq2.stem);
  
  const stemMatch = stem1 === stem2;
  const stemSimilarity = calculateSimilarity(mcq1.stem, mcq2.stem);
  
  // Check choices
  const choices1 = mcq1.choices.map(c => normalizeText(c.text)).sort().join('|');
  const choices2 = mcq2.choices.map(c => normalizeText(c.text)).sort().join('|');
  const choicesMatch = choices1 === choices2;
  
  const isExact = stemMatch && choicesMatch;
  
  // Calculate overall similarity
  const choiceSimilarity = calculateSimilarity(choices1, choices2);
  const similarity = (stemSimilarity * 0.7) + (choiceSimilarity * 0.3);
  
  return { isExact, similarity };
}

/**
 * Check if two flashcards are duplicates
 */
export function isFlashcardDuplicate(
  card1: { front: string; back: string },
  card2: { front: string; back: string }
): { isExact: boolean; similarity: number } {
  const front1 = normalizeText(card1.front);
  const front2 = normalizeText(card2.front);
  const back1 = normalizeText(card1.back);
  const back2 = normalizeText(card2.back);
  
  const isExact = front1 === front2 && back1 === back2;
  
  const frontSimilarity = calculateSimilarity(card1.front, card2.front);
  const backSimilarity = calculateSimilarity(card1.back, card2.back);
  const similarity = (frontSimilarity * 0.5) + (backSimilarity * 0.5);
  
  return { isExact, similarity };
}

export interface DuplicateResult<T> {
  item: T;
  rowIndex: number;
  isExactDuplicate: boolean;
  isPossibleDuplicate: boolean;
  similarity: number;
  matchedItemId?: string;
  status: 'pending' | 'import' | 'skip';
}

/**
 * Find duplicates in a list of items against existing items
 */
export function findDuplicates<T, E extends { id: string }>(
  newItems: T[],
  existingItems: E[],
  compareFn: (a: T, b: E) => { isExact: boolean; similarity: number },
  similarityThreshold: number = 0.85
): DuplicateResult<T>[] {
  return newItems.map((item, index) => {
    let bestMatch: { itemId: string; isExact: boolean; similarity: number } | null = null;
    
    for (const existing of existingItems) {
      const result = compareFn(item, existing);
      
      if (result.isExact) {
        bestMatch = { itemId: existing.id, isExact: true, similarity: 1 };
        break;
      }
      
      if (result.similarity >= similarityThreshold) {
        if (!bestMatch || result.similarity > bestMatch.similarity) {
          bestMatch = { itemId: existing.id, isExact: false, similarity: result.similarity };
        }
      }
    }
    
    return {
      item,
      rowIndex: index + 1,
      isExactDuplicate: bestMatch?.isExact ?? false,
      isPossibleDuplicate: !bestMatch?.isExact && (bestMatch?.similarity ?? 0) >= similarityThreshold,
      similarity: bestMatch?.similarity ?? 0,
      matchedItemId: bestMatch?.itemId,
      status: 'pending' as const,
    };
  });
}
