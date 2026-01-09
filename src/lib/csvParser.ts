/**
 * Header-based CSV parser for MCQ bulk imports
 * Detects column mappings dynamically and applies auto-corrections
 */

import type { McqFormData, McqChoice } from '@/hooks/useMcqs';

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
};

export interface ParseCorrection {
  type: 'column_mapped' | 'correct_key_converted' | 'header_skipped' | 'whitespace_trimmed';
  originalValue?: string;
  correctedValue?: string;
  row?: number;
  column?: string;
  message: string;
}

export interface ParseResult {
  mcqs: McqFormData[];
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

// Resolve correct key from various formats
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
  
  // If text, find matching choice
  if (trimmed.length > 1) {
    const matchingChoice = choices.find(c => 
      c.text.toLowerCase().trim() === trimmed.toLowerCase()
    );
    
    if (matchingChoice) {
      return {
        key: matchingChoice.key,
        correction: {
          type: 'correct_key_converted',
          originalValue: trimmed.substring(0, 30) + (trimmed.length > 30 ? '...' : ''),
          correctedValue: matchingChoice.key,
          row: rowIndex + 1,
          message: `Row ${rowIndex + 1}: Answer key matched to choice "${matchingChoice.key}"`
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
    return { mcqs: [], corrections: [], errors: ['CSV file is empty'], columnMapping: {} };
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
    
    const stem = getValue('stem');
    
    // Skip rows with no stem or stems that are just numbers (likely row numbers)
    if (!stem || /^\d+$/.test(stem)) continue;
    
    const choices: McqChoice[] = [
      { key: 'A', text: getValue('choice_a') },
      { key: 'B', text: getValue('choice_b') },
      { key: 'C', text: getValue('choice_c') },
      { key: 'D', text: getValue('choice_d') },
      { key: 'E', text: getValue('choice_e') },
    ];
    
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
    
    const explanation = getValue('explanation') || null;
    const difficultyRaw = getValue('difficulty')?.toLowerCase();
    const difficulty: 'easy' | 'medium' | 'hard' | null = 
      ['easy', 'medium', 'hard'].includes(difficultyRaw) 
        ? difficultyRaw as 'easy' | 'medium' | 'hard' 
        : null;
    
    mcqs.push({
      stem,
      choices,
      correct_key: correctKey,
      explanation,
      difficulty,
    });
  }
  
  return { 
    mcqs, 
    corrections, 
    errors,
    columnMapping: columnNameMap,
  };
}
