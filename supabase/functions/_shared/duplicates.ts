// ============================================
// Duplicate Detection Utilities
// Fast hash-based detection with fallback similarity
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ContentType = 
  | 'mcq' 
  | 'flashcard' 
  | 'essay' 
  | 'osce' 
  | 'matching';

// ============================================
// TEXT NORMALIZATION
// ============================================

/**
 * Normalize text for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Remove punctuation
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

// ============================================
// HASH GENERATION (Fast O(1) lookup)
// ============================================

/**
 * Generate a content hash for fast duplicate detection
 * Uses normalized text to create fingerprint
 */
export function generateContentHash(item: any, contentType: ContentType): string {
  let hashInput = '';
  
  switch (contentType) {
    case 'mcq':
      // Hash stem + all choice texts (sorted for consistency)
      const stem = normalizeText(item.stem || '');
      const choices = Array.isArray(item.choices) 
        ? item.choices.map((c: any) => normalizeText(c.text || c)).sort().join('|')
        : '';
      hashInput = `${stem}|${choices}`;
      break;
      
    case 'flashcard':
      hashInput = `${normalizeText(item.front || '')}|${normalizeText(item.back || '')}`;
      break;
      
    case 'cloze_flashcard':
      hashInput = normalizeText(item.cloze_text || '');
      break;
      
    case 'essay':
      // Hash question (title can vary)
      hashInput = normalizeText(item.question || '');
      break;
      
    case 'osce':
      // Hash history + first 2 statements
      hashInput = [
        normalizeText(item.history_text || ''),
        normalizeText(item.statement_1 || ''),
        normalizeText(item.statement_2 || ''),
      ].join('|');
      break;
      
    case 'matching':
      // Hash instruction + column A items (sorted)
      const instruction = normalizeText(item.instruction || '');
      const colA = Array.isArray(item.column_a_items)
        ? item.column_a_items.map((a: any) => normalizeText(a.text || '')).sort().join('|')
        : '';
      hashInput = `${instruction}|${colA}`;
      break;
      
    default:
      hashInput = JSON.stringify(item);
  }
  
  // Simple hash using btoa (base64) - truncated for storage
  // In production, consider using crypto.subtle.digest
  try {
    return btoa(unescape(encodeURIComponent(hashInput))).substring(0, 40);
  } catch {
    // Fallback for encoding issues
    return btoa(hashInput.replace(/[^\x00-\x7F]/g, '')).substring(0, 40);
  }
}

// ============================================
// SIMILARITY CALCULATION (Fallback for near-duplicates)
// ============================================

/**
 * Levenshtein distance for string similarity
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
 * Calculate similarity ratio between two strings (0-1)
 */
function calculateStringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

/**
 * Calculate content similarity between two items
 */
export function calculateContentSimilarity(
  item1: any,
  item2: any,
  contentType: ContentType
): number {
  switch (contentType) {
    case 'mcq':
      const stem1 = normalizeText(item1.stem || '');
      const stem2 = normalizeText(item2.stem || '');
      return calculateStringSimilarity(stem1, stem2);
      
    case 'flashcard':
      const front1 = normalizeText(item1.front || '');
      const front2 = normalizeText(item2.front || '');
      return calculateStringSimilarity(front1, front2);
      
    case 'cloze_flashcard':
      const cloze1 = normalizeText(item1.cloze_text || '');
      const cloze2 = normalizeText(item2.cloze_text || '');
      return calculateStringSimilarity(cloze1, cloze2);
      
    case 'essay':
      const q1 = normalizeText(item1.question || '');
      const q2 = normalizeText(item2.question || '');
      return calculateStringSimilarity(q1, q2);
      
    case 'osce':
      const h1 = normalizeText(item1.history_text || '');
      const h2 = normalizeText(item2.history_text || '');
      return calculateStringSimilarity(h1, h2);
      
    case 'matching':
      const i1 = normalizeText(item1.instruction || '');
      const i2 = normalizeText(item2.instruction || '');
      return calculateStringSimilarity(i1, i2);
      
    default:
      return 0;
  }
}

// ============================================
// DATABASE DUPLICATE CHECKING
// ============================================

const TABLE_MAP: Partial<Record<ContentType, string>> = {
  mcq: 'mcqs',
  flashcard: 'study_resources',
  essay: 'essays',
  osce: 'osce_questions',
  matching: 'matching_questions',
};

const FIELD_MAP: Partial<Record<ContentType, string[]>> = {
  mcq: ['id', 'stem', 'choices'],
  flashcard: ['id', 'content'],
  essay: ['id', 'question'],
  osce: ['id', 'history_text', 'statement_1', 'statement_2'],
  matching: ['id', 'instruction', 'column_a_items'],
};

export interface DuplicateCheckResult {
  unique: any[];
  duplicates: {
    item: any;
    matchedId?: string;
    similarity: number;
  }[];
}

/**
 * Check for duplicates against database
 * Two-pass approach:
 * 1. Fast hash check for exact matches
 * 2. Similarity check for near-duplicates (only on small sets)
 */
export async function checkDatabaseDuplicates(
  items: any[],
  contentType: ContentType,
  moduleId: string,
  chapterId: string | null,
  serviceClient: ReturnType<typeof createClient>,
  similarityThreshold: number = 0.85
): Promise<DuplicateCheckResult> {
  const tableName = TABLE_MAP[contentType];
  const fields = FIELD_MAP[contentType];
  
  if (!tableName || !fields) {
    // No duplicate check for this content type
    return { unique: items, duplicates: [] };
  }
  
  // Generate hashes for new items
  const newItemsWithHash = items.map(item => ({
    item,
    hash: generateContentHash(item, contentType),
  }));
  
  // Build query for existing items
  let query = serviceClient
    .from(tableName)
    .select(fields.join(','))
    .eq('module_id', moduleId)
    .eq('is_deleted', false)
    .limit(500);
  
  if (chapterId && contentType !== 'essay') {
    query = query.eq('chapter_id', chapterId);
  }
  
  const { data: existingItems, error } = await query;
  
  if (error) {
    console.error('Failed to fetch existing items for duplicate check:', error.message);
    return { unique: items, duplicates: [] };
  }
  
  // Generate hashes for existing items
  const existingHashes = new Map<string, string>();
  const existingItemsMap = new Map<string, any>();
  
  for (const existing of (existingItems || []) as any[]) {
    // For flashcards, content is nested
    const itemToHash = contentType === 'flashcard' && existing.content
      ? { front: existing.content.front, back: existing.content.back }
      : existing;
    
    const hash = generateContentHash(itemToHash, contentType);
    existingHashes.set(hash, existing.id);
    existingItemsMap.set(existing.id, existing);
  }
  
  // Check for duplicates
  const unique: any[] = [];
  const duplicates: DuplicateCheckResult['duplicates'] = [];
  const addedHashes = new Set<string>();
  
  for (const { item, hash } of newItemsWithHash) {
    // Exact hash match (fastest)
    if (existingHashes.has(hash)) {
      duplicates.push({
        item,
        matchedId: existingHashes.get(hash),
        similarity: 1.0,
      });
      continue;
    }
    
    // Intra-batch duplicate check
    if (addedHashes.has(hash)) {
      duplicates.push({
        item,
        similarity: 1.0,
      });
      continue;
    }
    
    // Similarity check (only if we have a small number of existing items)
    let isDuplicate = false;
    
    if ((existingItems?.length || 0) < 200) {
      for (const existing of (existingItems || []) as any[]) {
        const existingToCompare = contentType === 'flashcard' && existing.content
          ? { front: existing.content.front, back: existing.content.back }
          : existing;
        
        const similarity = calculateContentSimilarity(item, existingToCompare, contentType);
        
        if (similarity >= similarityThreshold) {
          duplicates.push({
            item,
            matchedId: existing.id,
            similarity,
          });
          isDuplicate = true;
          break;
        }
      }
    }
    
    if (!isDuplicate) {
      unique.push(item);
      addedHashes.add(hash);
    }
  }
  
  return { unique, duplicates };
}

/**
 * Check for duplicates within a batch (no DB)
 */
export function checkIntraBatchDuplicates(
  items: any[],
  contentType: ContentType
): DuplicateCheckResult {
  const unique: any[] = [];
  const duplicates: DuplicateCheckResult['duplicates'] = [];
  const seenHashes = new Set<string>();
  
  for (const item of items) {
    const hash = generateContentHash(item, contentType);
    
    if (seenHashes.has(hash)) {
      duplicates.push({ item, similarity: 1.0 });
    } else {
      unique.push(item);
      seenHashes.add(hash);
    }
  }
  
  return { unique, duplicates };
}
