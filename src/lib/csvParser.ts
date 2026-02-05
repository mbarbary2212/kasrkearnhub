/**
 * Header-based CSV parser for bulk imports
 * Detects column mappings dynamically and applies auto-corrections
 * Includes data sanitization (HTML/Markdown stripping)
 */

import type { McqFormData, McqChoice } from '@/hooks/useMcqs';
import type { MatchingQuestionFormData, MatchItem } from '@/hooks/useMatchingQuestions';
import { McqFormSchema } from './validators';

// ============================================
// DATA SANITIZATION UTILITIES
// ============================================

/**
 * Strip HTML tags and Markdown formatting from text
 */
export function stripHtmlAndMarkdown(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let result = text;
  
  // Strip HTML tags
  result = result.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  result = result
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Strip Markdown bold/italic
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold**
  result = result.replace(/\*([^*]+)\*/g, '$1');     // *italic*
  result = result.replace(/__([^_]+)__/g, '$1');     // __bold__
  result = result.replace(/_([^_]+)_/g, '$1');       // _italic_
  
  // Strip Markdown headers
  result = result.replace(/^#{1,6}\s*/gm, '');
  
  // Strip Markdown links [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Strip Markdown images ![alt](url) -> alt
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Strip backticks for inline code
  result = result.replace(/`([^`]+)`/g, '$1');
  
  // Strip code blocks
  result = result.replace(/```[\s\S]*?```/g, '');
  
  // Collapse multiple spaces to one
  result = result.replace(/\s+/g, ' ');
  
  // Trim
  result = result.trim();
  
  return result;
}

/**
 * Sanitize a complete MCQ object
 */
export function sanitizeMcq(mcq: McqFormData): McqFormData {
  return {
    stem: stripHtmlAndMarkdown(mcq.stem),
    choices: mcq.choices.map(c => ({
      key: c.key,
      text: stripHtmlAndMarkdown(c.text)
    })),
    correct_key: mcq.correct_key,
    explanation: mcq.explanation ? stripHtmlAndMarkdown(mcq.explanation) : null,
    difficulty: mcq.difficulty
  };
}

// ============================================
// COLUMN MAPPINGS
// ============================================

// Column name mappings for auto-detection (lowercase normalized)
const COLUMN_MAPPINGS: Record<string, string> = {
  // Skip columns
  'q#': 'skip',
  'row': 'skip',
  'id': 'skip',
  'number': 'skip',
  'no': 'skip',
  'tags': 'skip',
  
  // Stem variations
  'stem': 'stem',
  'stem_text': 'stem',
  'stemtext': 'stem',
  'question': 'stem',
  'question_text': 'stem',
  'questiontext': 'stem',
  
  // Choice A variations
  'choicea': 'choice_a',
  'choice_a': 'choice_a',
  'optiona': 'choice_a',
  'option_a': 'choice_a',
  'a': 'choice_a',
  'answer_a': 'choice_a',
  
  // Choice B variations
  'choiceb': 'choice_b',
  'choice_b': 'choice_b',
  'optionb': 'choice_b',
  'option_b': 'choice_b',
  'b': 'choice_b',
  'answer_b': 'choice_b',
  
  // Choice C variations
  'choicec': 'choice_c',
  'choice_c': 'choice_c',
  'optionc': 'choice_c',
  'option_c': 'choice_c',
  'c': 'choice_c',
  'answer_c': 'choice_c',
  
  // Choice D variations
  'choiced': 'choice_d',
  'choice_d': 'choice_d',
  'optiond': 'choice_d',
  'option_d': 'choice_d',
  'd': 'choice_d',
  'answer_d': 'choice_d',
  
  // Choice E variations
  'choicee': 'choice_e',
  'choice_e': 'choice_e',
  'optione': 'choice_e',
  'option_e': 'choice_e',
  'e': 'choice_e',
  'answer_e': 'choice_e',
  
  // Correct key variations
  'correct_key': 'correct_key',
  'correctkey': 'correct_key',
  'correct': 'correct_key',
  'correctone': 'correct_key',
  'correct_one': 'correct_key',
  'answer': 'correct_key',
  'answer_key': 'correct_key',
  'answerkey': 'correct_key',
  'key': 'correct_key',
  'correct_answer': 'correct_key',
  'correctanswer': 'correct_key',
  
  // Explanation variations
  'explanation': 'explanation',
  'whythis': 'explanation',
  'why_this': 'explanation',
  'reason': 'explanation',
  'rationale': 'explanation',
  'description': 'explanation',
  
  // Difficulty variations
  'difficulty': 'difficulty',
  'level': 'difficulty',
  'diff': 'difficulty',
  
  // Section variations
  'section_name': 'section_name',
  'sectionname': 'section_name',
  'section': 'section_name',
  'section_number': 'section_number',
  'sectionnumber': 'section_number',
  'section_num': 'section_number',
  'sectionnum': 'section_number',
};

export interface ParseCorrection {
  type: 'column_mapped' | 'correct_key_converted' | 'header_skipped' | 'whitespace_trimmed' | 'html_stripped' | 'validation_error';
  originalValue?: string;
  correctedValue?: string;
  row?: number;
  column?: string;
  message: string;
}

export interface McqParsedRow {
  mcq: McqFormData;
  sectionName?: string;
  sectionNumber?: number;
}

export interface ParseResult {
  mcqs: McqFormData[];
  parsedRows: McqParsedRow[];
  corrections: ParseCorrection[];
  errors: string[];
  columnMapping: Record<string, string>;
}

// Parse a single CSV line handling quotes
function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  return parts;
}

// Detect if first row is a header
function isHeaderRow(firstLine: string): boolean {
  const lower = firstLine.toLowerCase();
  const headerKeywords = [
    'stem', 'question', 'correct_key', 'answer_key', 'choice_a', 'choicea', 
    'option_a', 'explanation', 'difficulty', 'correctone', 'whythis'
  ];
  return headerKeywords.some(keyword => lower.includes(keyword));
}

// Normalize column name for mapping lookup
function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Resolve correct key from various formats (advanced normalization)
function resolveCorrectKey(
  value: string, 
  choices: McqChoice[],
  rowIndex: number
): { key: string; correction?: ParseCorrection } {
  const trimmed = (value || '').trim();
  
  // If already a letter A-E (case insensitive)
  if (/^[A-Ea-e]$/.test(trimmed)) {
    const normalized = trimmed.toUpperCase();
    if (trimmed !== normalized) {
      return {
        key: normalized,
        correction: {
          type: 'correct_key_converted',
          originalValue: trimmed,
          correctedValue: normalized,
          row: rowIndex + 1,
          message: `Row ${rowIndex + 1}: Answer key "${trimmed}" → "${normalized}" (uppercase)`
        }
      };
    }
    return { key: normalized };
  }
  
  // Convert numeric to letter (1=A, 2=B, 3=C, 4=D, 5=E)
  const numericMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
  if (numericMap[trimmed]) {
    return {
      key: numericMap[trimmed],
      correction: {
        type: 'correct_key_converted',
        originalValue: trimmed,
        correctedValue: numericMap[trimmed],
        row: rowIndex + 1,
        message: `Row ${rowIndex + 1}: Answer key "${trimmed}" → "${numericMap[trimmed]}" (numeric to letter)`
      }
    };
  }
  
  // Check for patterns like "Option B", "Answer: C", "Choice D", "The correct answer is A"
  const letterPatterns = [
    /\b(?:option|choice|answer)\s*:?\s*([A-Ea-e])\b/i,
    /\b([A-Ea-e])\s*(?:is correct|is the answer)/i,
    /correct\s*(?:answer\s*)?(?:is\s*)?:?\s*([A-Ea-e])\b/i,
    /\b([A-Ea-e])\b/  // Last resort: any single letter A-E
  ];
  
  for (const pattern of letterPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].toUpperCase();
      return {
        key: extracted,
        correction: {
          type: 'correct_key_converted',
          originalValue: trimmed.substring(0, 40) + (trimmed.length > 40 ? '...' : ''),
          correctedValue: extracted,
          row: rowIndex + 1,
          message: `Row ${rowIndex + 1}: Extracted answer key "${extracted}" from "${trimmed.substring(0, 30)}..."`
        }
      };
    }
  }
  
  // If text, find matching choice by exact or partial match
  if (trimmed.length > 1) {
    const lowerTrimmed = trimmed.toLowerCase();
    
    // Try exact match first
    const exactMatch = choices.find(c => 
      c.text.toLowerCase().trim() === lowerTrimmed
    );
    
    if (exactMatch) {
      return {
        key: exactMatch.key,
        correction: {
          type: 'correct_key_converted',
          originalValue: trimmed.substring(0, 30) + (trimmed.length > 30 ? '...' : ''),
          correctedValue: exactMatch.key,
          row: rowIndex + 1,
          message: `Row ${rowIndex + 1}: Answer key matched to choice "${exactMatch.key}" (exact)`
        }
      };
    }
    
    // Try partial match (answer text contains choice or vice versa)
    const partialMatch = choices.find(c => {
      const choiceLower = c.text.toLowerCase().trim();
      return lowerTrimmed.includes(choiceLower) || choiceLower.includes(lowerTrimmed);
    });
    
    if (partialMatch) {
      return {
        key: partialMatch.key,
        correction: {
          type: 'correct_key_converted',
          originalValue: trimmed.substring(0, 30) + (trimmed.length > 30 ? '...' : ''),
          correctedValue: partialMatch.key,
          row: rowIndex + 1,
          message: `Row ${rowIndex + 1}: Answer key matched to choice "${partialMatch.key}" (partial)`
        }
      };
    }
  }
  
  // Default fallback to A
  return {
    key: 'A',
    correction: {
      type: 'correct_key_converted',
      originalValue: trimmed || '(empty)',
      correctedValue: 'A',
      row: rowIndex + 1,
      message: `Row ${rowIndex + 1}: Answer key "${trimmed || '(empty)'}" → "A" (fallback default)`
    }
  };
}

// Build column index mapping from headers
function buildColumnMapping(headers: string[]): { 
  mapping: Record<string, number>;
  corrections: ParseCorrection[];
  columnNameMap: Record<string, string>;
} {
  const mapping: Record<string, number> = {};
  const corrections: ParseCorrection[] = [];
  const columnNameMap: Record<string, string> = {};
  
  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header);
    const targetColumn = COLUMN_MAPPINGS[normalized];
    
    if (targetColumn && targetColumn !== 'skip') {
      if (!mapping[targetColumn]) {
        mapping[targetColumn] = index;
        
        // Track if column name was different from the target
        const standardName = targetColumn.replace(/_/g, ' ');
        if (normalized !== targetColumn.replace(/_/g, '')) {
          columnNameMap[header] = targetColumn;
          corrections.push({
            type: 'column_mapped',
            originalValue: header,
            correctedValue: targetColumn,
            column: header,
            message: `Column "${header}" → "${targetColumn}"`
          });
        }
      }
    } else if (targetColumn === 'skip') {
      // Silently skip known skip columns
    } else {
      // Try positional fallback for common patterns
      // If first column looks like a number, might be row number
      if (index === 0 && /^\d+$/.test(header)) {
        // Skip numeric first column
      }
    }
  });
  
  return { mapping, corrections, columnNameMap };
}

// Main parser function
export function parseSmartMcqCsv(csvText: string): ParseResult {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  const corrections: ParseCorrection[] = [];
  const errors: string[] = [];
  
  if (lines.length === 0) {
    return { mcqs: [], parsedRows: [], corrections: [], errors: ['CSV file is empty'], columnMapping: {} };
  }
  
  const hasHeader = isHeaderRow(lines[0]);
  let columnMapping: Record<string, number> = {};
  let columnNameMap: Record<string, string> = {};
  let startIndex = 0;
  
  if (hasHeader) {
    const headers = parseCSVLine(lines[0]);
    const mappingResult = buildColumnMapping(headers);
    columnMapping = mappingResult.mapping;
    columnNameMap = mappingResult.columnNameMap;
    corrections.push(...mappingResult.corrections);
    corrections.push({
      type: 'header_skipped',
      message: 'Header row detected and skipped'
    });
    startIndex = 1;
  } else {
    // Fallback to positional parsing (original behavior)
    columnMapping = {
      'stem': 0,
      'choice_a': 1,
      'choice_b': 2,
      'choice_c': 3,
      'choice_d': 4,
      'choice_e': 5,
      'correct_key': 6,
      'explanation': 7,
      'difficulty': 8,
    };
  }
  
  const mcqs: McqFormData[] = [];
  const parsedRows: McqParsedRow[] = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    const rowIndex = i - startIndex;
    
    // Skip empty rows or rows that look like just a number
    if (parts.length === 0) continue;
    if (parts.length === 1 && /^\d+$/.test(parts[0])) continue;
    
    // Extract values using column mapping
    const getValue = (column: string): string => {
      const index = columnMapping[column];
      return index !== undefined ? (parts[index] || '').trim() : '';
    };
    
    const stemRaw = getValue('stem');
    
    // Skip rows with no stem or stems that are just numbers (likely row numbers)
    if (!stemRaw || /^\d+$/.test(stemRaw)) continue;
    
    // Apply sanitization to all text fields
    const stem = stripHtmlAndMarkdown(stemRaw);
    
    const allChoices: McqChoice[] = [
      { key: 'A', text: stripHtmlAndMarkdown(getValue('choice_a')) },
      { key: 'B', text: stripHtmlAndMarkdown(getValue('choice_b')) },
      { key: 'C', text: stripHtmlAndMarkdown(getValue('choice_c')) },
      { key: 'D', text: stripHtmlAndMarkdown(getValue('choice_d')) },
      { key: 'E', text: stripHtmlAndMarkdown(getValue('choice_e')) },
    ];
    
    // Filter: keep A-D always, keep E only if non-empty
    const choices = allChoices.filter(c => 
      c.key !== 'E' || c.text.trim() !== ''
    );
    
    // Check if any HTML/Markdown was stripped
    const stemHadFormatting = stemRaw !== stem;
    if (stemHadFormatting && !corrections.some(c => c.type === 'html_stripped')) {
      corrections.push({
        type: 'html_stripped',
        message: 'HTML tags and Markdown formatting were stripped from content'
      });
    }
    
    // Resolve correct key with potential correction
    const correctKeyRaw = getValue('correct_key');
    const { key: correctKey, correction: keyCorrection } = resolveCorrectKey(
      correctKeyRaw, 
      choices,
      rowIndex
    );
    
    if (keyCorrection) {
      corrections.push(keyCorrection);
    }
    
    const explanationRaw = getValue('explanation');
    const explanation = explanationRaw ? stripHtmlAndMarkdown(explanationRaw) : null;
    const difficultyRaw = getValue('difficulty')?.toLowerCase();
    const difficulty: 'easy' | 'medium' | 'hard' | null = 
      ['easy', 'medium', 'hard'].includes(difficultyRaw) 
        ? difficultyRaw as 'easy' | 'medium' | 'hard' 
        : null;
    
    // Extract section info
    const sectionName = getValue('section_name') || undefined;
    const sectionNumberRaw = getValue('section_number');
    const sectionNumber = sectionNumberRaw ? parseInt(sectionNumberRaw, 10) : undefined;
    
    const mcq: McqFormData = {
      stem,
      choices,
      correct_key: correctKey,
      explanation,
      difficulty,
    };
    
    mcqs.push(mcq);
    parsedRows.push({ 
      mcq, 
      sectionName: sectionName || undefined,
      sectionNumber: !isNaN(sectionNumber as number) ? sectionNumber : undefined,
    });
  }
  
  // Validate all parsed MCQs
  const validatedMcqs: McqFormData[] = [];
  const validatedParsedRows: McqParsedRow[] = [];
  for (let i = 0; i < parsedRows.length; i++) {
    const { mcq, sectionName, sectionNumber } = parsedRows[i];
    const result = McqFormSchema.safeParse(mcq);
    
    if (result.success) {
      validatedMcqs.push(mcq);
      validatedParsedRows.push({ mcq, sectionName, sectionNumber });
    } else {
      const errorMessages = result.error.errors.map(e => e.message).join(', ');
      corrections.push({
        type: 'validation_error',
        row: i + startIndex + 1, // Account for header and 1-indexing
        message: `Row ${i + startIndex + 1}: Validation failed - ${errorMessages}`
      });
      errors.push(`Row ${i + startIndex + 1}: ${errorMessages}`);
    }
  }

  return { 
    mcqs: validatedMcqs, 
    parsedRows: validatedParsedRows,
    corrections, 
    errors,
    columnMapping: columnNameMap,
  };
}

// ============================================
// MATCHING QUESTION PARSER
// ============================================

// Column mappings for matching questions
const MATCHING_COLUMN_MAPPINGS: Record<string, string> = {
  // Instruction variations
  'instruction': 'instruction',
  'instructions': 'instruction',
  'prompt': 'instruction',
  'question': 'instruction',
  
  // Column A items
  'item_a_1': 'item_a_1',
  'itema1': 'item_a_1',
  'a1': 'item_a_1',
  'column_a_1': 'item_a_1',
  'item_a_2': 'item_a_2',
  'itema2': 'item_a_2',
  'a2': 'item_a_2',
  'column_a_2': 'item_a_2',
  'item_a_3': 'item_a_3',
  'itema3': 'item_a_3',
  'a3': 'item_a_3',
  'column_a_3': 'item_a_3',
  'item_a_4': 'item_a_4',
  'itema4': 'item_a_4',
  'a4': 'item_a_4',
  'column_a_4': 'item_a_4',
  
  // Column B items
  'item_b_1': 'item_b_1',
  'itemb1': 'item_b_1',
  'b1': 'item_b_1',
  'column_b_1': 'item_b_1',
  'item_b_2': 'item_b_2',
  'itemb2': 'item_b_2',
  'b2': 'item_b_2',
  'column_b_2': 'item_b_2',
  'item_b_3': 'item_b_3',
  'itemb3': 'item_b_3',
  'b3': 'item_b_3',
  'column_b_3': 'item_b_3',
  'item_b_4': 'item_b_4',
  'itemb4': 'item_b_4',
  'b4': 'item_b_4',
  'column_b_4': 'item_b_4',
  
  // Match mappings
  'match_1': 'match_1',
  'match1': 'match_1',
  'answer_1': 'match_1',
  'match_2': 'match_2',
  'match2': 'match_2',
  'answer_2': 'match_2',
  'match_3': 'match_3',
  'match3': 'match_3',
  'answer_3': 'match_3',
  'match_4': 'match_4',
  'match4': 'match_4',
  'answer_4': 'match_4',
  
  // Other fields
  'explanation': 'explanation',
  'difficulty': 'difficulty',
  'show_explanation': 'show_explanation',
  'showexplanation': 'show_explanation',
  
  // Section variations
  'section_name': 'section_name',
  'sectionname': 'section_name',
  'section': 'section_name',
  'section_number': 'section_number',
  'sectionnumber': 'section_number',
  'section_num': 'section_number',
  'sectionnum': 'section_number',
};

export interface MatchingParsedRow {
  question: MatchingQuestionFormData;
  sectionName?: string;
  sectionNumber?: number;
}

export interface MatchingParseResult {
  questions: MatchingQuestionFormData[];
  parsedRows: MatchingParsedRow[];
  corrections: ParseCorrection[];
  errors: string[];
}

// Check if the first row is a header for matching questions
function isMatchingHeaderRow(firstLine: string): boolean {
  const lower = firstLine.toLowerCase();
  const headerKeywords = [
    'instruction', 'item_a', 'itema', 'item_b', 'itemb', 'match_', 
    'column_a', 'column_b', 'difficulty', 'explanation'
  ];
  return headerKeywords.some(keyword => lower.includes(keyword));
}

// Build column mapping for matching questions
function buildMatchingColumnMapping(headers: string[]): { 
  mapping: Record<string, number>;
  corrections: ParseCorrection[];
} {
  const mapping: Record<string, number> = {};
  const corrections: ParseCorrection[] = [];
  
  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header);
    const targetColumn = MATCHING_COLUMN_MAPPINGS[normalized];
    
    if (targetColumn) {
      if (!mapping[targetColumn]) {
        mapping[targetColumn] = index;
        
        if (normalized !== targetColumn.replace(/_/g, '')) {
          corrections.push({
            type: 'column_mapped',
            originalValue: header,
            correctedValue: targetColumn,
            column: header,
            message: `Column "${header}" → "${targetColumn}"`
          });
        }
      }
    }
  });
  
  return { mapping, corrections };
}

// Parse matching questions CSV with smart detection
export function parseSmartMatchingCsv(csvText: string): MatchingParseResult {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  const corrections: ParseCorrection[] = [];
  const errors: string[] = [];
  
  if (lines.length === 0) {
    return { questions: [], parsedRows: [], corrections: [], errors: ['CSV file is empty'] };
  }
  
  const hasHeader = isMatchingHeaderRow(lines[0]);
  let columnMapping: Record<string, number> = {};
  let startIndex = 0;
  
  if (hasHeader) {
    const headers = parseCSVLine(lines[0]);
    const mappingResult = buildMatchingColumnMapping(headers);
    columnMapping = mappingResult.mapping;
    corrections.push(...mappingResult.corrections);
    corrections.push({
      type: 'header_skipped',
      message: 'Header row detected and skipped'
    });
    startIndex = 1;
  } else {
    // Fallback to positional parsing
    columnMapping = {
      'instruction': 0,
      'item_a_1': 1,
      'item_a_2': 2,
      'item_a_3': 3,
      'item_a_4': 4,
      'item_b_1': 5,
      'item_b_2': 6,
      'item_b_3': 7,
      'item_b_4': 8,
      'match_1': 9,
      'match_2': 10,
      'match_3': 11,
      'match_4': 12,
      'explanation': 13,
      'difficulty': 14,
      'show_explanation': 15,
    };
  }
  
  const questions: MatchingQuestionFormData[] = [];
  const parsedRows: MatchingParsedRow[] = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    const rowIndex = i - startIndex;
    
    if (parts.length === 0) continue;
    
    const getValue = (column: string): string => {
      const index = columnMapping[column];
      return index !== undefined ? (parts[index] || '').trim() : '';
    };
    
    const instruction = getValue('instruction') || 'Match the items in Column A with the correct items in Column B';
    
    // Build column A items
    const columnAItems: MatchItem[] = [];
    ['item_a_1', 'item_a_2', 'item_a_3', 'item_a_4'].forEach((col, idx) => {
      const text = getValue(col);
      if (text) {
        columnAItems.push({ id: `a${idx + 1}`, text });
      }
    });
    
    // Build column B items
    const columnBItems: MatchItem[] = [];
    ['item_b_1', 'item_b_2', 'item_b_3', 'item_b_4'].forEach((col, idx) => {
      const text = getValue(col);
      if (text) {
        columnBItems.push({ id: `b${idx + 1}`, text });
      }
    });
    
    // Skip rows with insufficient items
    if (columnAItems.length < 2 || columnBItems.length < 2) continue;
    
    // Build correct matches with correction tracking
    const correctMatches: Record<string, string> = {};
    ['match_1', 'match_2', 'match_3', 'match_4'].forEach((col, idx) => {
      if (idx >= columnAItems.length) return;
      
      const matchValue = getValue(col);
      let matchIndex = parseInt(matchValue, 10);
      
      // Check if it's a letter (A, B, C, D) and convert
      if (isNaN(matchIndex) && /^[A-Da-d]$/.test(matchValue)) {
        const letterMap: Record<string, number> = { 'a': 1, 'b': 2, 'c': 3, 'd': 4, 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
        matchIndex = letterMap[matchValue];
        corrections.push({
          type: 'correct_key_converted',
          originalValue: matchValue,
          correctedValue: String(matchIndex),
          row: rowIndex + 1,
          message: `Row ${rowIndex + 1}: Match "${matchValue}" → "${matchIndex}" (letter to number)`
        });
      }
      
      if (matchIndex > 0 && matchIndex <= columnBItems.length) {
        correctMatches[columnAItems[idx].id] = `b${matchIndex}`;
      }
    });
    
    // Parse other fields
    const explanation = getValue('explanation') || null;
    const difficultyRaw = getValue('difficulty')?.toLowerCase();
    const difficulty: 'easy' | 'medium' | 'hard' | null = 
      ['easy', 'medium', 'hard'].includes(difficultyRaw) 
        ? difficultyRaw as 'easy' | 'medium' | 'hard' 
        : null;
    
    const showExplanationRaw = getValue('show_explanation')?.toLowerCase();
    const showExplanation = showExplanationRaw !== 'false';
    
    // Extract section info
    const sectionName = getValue('section_name') || undefined;
    const sectionNumberRaw = getValue('section_number');
    const sectionNumber = sectionNumberRaw ? parseInt(sectionNumberRaw, 10) : undefined;
    
    const question: MatchingQuestionFormData = {
      instruction,
      column_a_items: columnAItems,
      column_b_items: columnBItems,
      correct_matches: correctMatches,
      explanation,
      show_explanation: showExplanation,
      difficulty,
    };
    
    questions.push(question);
    parsedRows.push({
      question,
      sectionName: sectionName || undefined,
      sectionNumber: !isNaN(sectionNumber as number) ? sectionNumber : undefined,
    });
  }
  
  return { questions, parsedRows, corrections, errors };
}
