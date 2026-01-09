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
 * Check if two OSCE questions are duplicates
 * Compares history text and all 5 statements
 */
export function isOsceDuplicate(
  osce1: { history_text: string; statement_1: string; statement_2: string; statement_3: string; statement_4: string; statement_5: string },
  osce2: { history_text: string; statement_1: string; statement_2: string; statement_3: string; statement_4: string; statement_5: string }
): { isExact: boolean; similarity: number } {
  const history1 = normalizeText(osce1.history_text);
  const history2 = normalizeText(osce2.history_text);
  
  const historyMatch = history1 === history2;
  const historySimilarity = calculateSimilarity(osce1.history_text, osce2.history_text);
  
  // Check all statements
  const statements1 = [osce1.statement_1, osce1.statement_2, osce1.statement_3, osce1.statement_4, osce1.statement_5]
    .map(s => normalizeText(s)).sort().join('|');
  const statements2 = [osce2.statement_1, osce2.statement_2, osce2.statement_3, osce2.statement_4, osce2.statement_5]
    .map(s => normalizeText(s)).sort().join('|');
  const statementsMatch = statements1 === statements2;
  
  const isExact = historyMatch && statementsMatch;
  
  // Calculate overall similarity (history weighted more heavily)
  const statementSimilarity = calculateSimilarity(statements1, statements2);
  const similarity = (historySimilarity * 0.6) + (statementSimilarity * 0.4);
  
  return { isExact, similarity };
}

/**
 * Check if two matching questions are duplicates
 * Compares instruction and column items
 */
export function isMatchingDuplicate(
  match1: { instruction: string; column_a_items: any[]; column_b_items: any[] },
  match2: { instruction: string; column_a_items: any[]; column_b_items: any[] }
): { isExact: boolean; similarity: number } {
  const instruction1 = normalizeText(match1.instruction);
  const instruction2 = normalizeText(match2.instruction);
  
  const instructionMatch = instruction1 === instruction2;
  const instructionSimilarity = calculateSimilarity(match1.instruction, match2.instruction);
  
  // Check column A items
  const colA1 = (match1.column_a_items || []).map((item: any) => normalizeText(typeof item === 'string' ? item : item.text || '')).sort().join('|');
  const colA2 = (match2.column_a_items || []).map((item: any) => normalizeText(typeof item === 'string' ? item : item.text || '')).sort().join('|');
  
  // Check column B items
  const colB1 = (match1.column_b_items || []).map((item: any) => normalizeText(typeof item === 'string' ? item : item.text || '')).sort().join('|');
  const colB2 = (match2.column_b_items || []).map((item: any) => normalizeText(typeof item === 'string' ? item : item.text || '')).sort().join('|');
  
  const columnsMatch = colA1 === colA2 && colB1 === colB2;
  
  const isExact = instructionMatch && columnsMatch;
  
  // Calculate overall similarity
  const colASimilarity = calculateSimilarity(colA1, colA2);
  const colBSimilarity = calculateSimilarity(colB1, colB2);
  const columnSimilarity = (colASimilarity + colBSimilarity) / 2;
  const similarity = (instructionSimilarity * 0.5) + (columnSimilarity * 0.5);
  
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
