import type { Section } from '@/hooks/useSections';

export interface ConceptLookup {
  id: string;
  title: string;
}

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  getValue?: (item: T, sections?: Section[], concepts?: ConceptLookup[]) => string;
}

// Escape a CSV field value
function escapeField(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the value contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Resolve section name and number from section_id
export function resolveSectionInfo(
  sectionId: string | null | undefined,
  sections: Section[]
): { name: string; number: string } {
  if (!sectionId) return { name: '', number: '' };
  const section = sections.find(s => s.id === sectionId);
  if (!section) return { name: '', number: '' };
  return {
    name: section.name,
    number: section.section_number?.toString() || '',
  };
}

// Resolve section ID from name or number
export function resolveSectionId(
  sections: Section[],
  sectionName?: string,
  sectionNumber?: number | string
): string | null {
  // Priority 1: Match by section_name (case-insensitive, exact)
  if (sectionName && sectionName.trim()) {
    const normalizedInput = sectionName.toLowerCase().trim();
    const exactMatch = sections.find(s => 
      s.name.toLowerCase().trim() === normalizedInput
    );
    if (exactMatch) return exactMatch.id;

    // Strip leading number prefix (e.g., "3.2 Deep Vein Thrombosis" → "Deep Vein Thrombosis")
    const strippedInput = normalizedInput.replace(/^\d+(\.\d+)?\s+/, '');
    
    // Check stripped input for exact match
    const strippedExact = sections.find(s => 
      s.name.toLowerCase().trim() === strippedInput
    );
    if (strippedExact) return strippedExact.id;

    // Partial/contains match on section_name
    let bestMatch: Section | null = null;
    let bestLength = 0;
    
    for (const s of sections) {
      const dbName = s.name.toLowerCase().trim();
      if (dbName.length < 3) continue;
      
      if (strippedInput.includes(dbName) || dbName.includes(strippedInput)) {
        const matchLen = Math.min(dbName.length, strippedInput.length);
        if (matchLen > bestLength) {
          bestLength = matchLen;
          bestMatch = s;
        }
      }
    }
    
    if (bestMatch) return bestMatch.id;
    
    // Word-overlap scoring: match sections sharing significant words
    const stopWords = new Set(['of', 'the', 'and', 'in', 'a', 'an', 'to', 'for', 'with', 'on']);
    const inputWords = strippedInput.replace(/[(),-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    
    if (inputWords.length > 0) {
      let bestOverlap = 0;
      let bestOverlapSection: Section | null = null;
      
      for (const s of sections) {
        const dbWords = s.name.toLowerCase().replace(/[(),-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
        const overlap = inputWords.filter(w => dbWords.some(dw => dw.includes(w) || w.includes(dw))).length;
        if (overlap >= 2 && overlap > bestOverlap) {
          bestOverlap = overlap;
          bestOverlapSection = s;
        }
      }
      
      if (bestOverlapSection) return bestOverlapSection.id;
    }
  }
  
  // Fallback: Match by section_number (optional)
  if (sectionNumber !== undefined && sectionNumber !== '') {
    const sectionNumStr = String(sectionNumber).trim();
    if (sectionNumStr) {
      const match = sections.find(s => s.section_number === sectionNumStr);
      if (match) return match.id;
    }
  }
  
  return null;
}

// Generic CSV export function
export function resolveConceptName(
  conceptId: string | null | undefined,
  concepts: ConceptLookup[]
): string {
  if (!conceptId) return '';
  const concept = concepts.find(c => c.id === conceptId);
  return concept?.title || '';
}

export function exportToCsv<T>(
  items: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sections?: Section[],
  concepts?: ConceptLookup[]
): void {
  // Generate header row
  const headers = columns.map(col => escapeField(col.header)).join(',');
  
  // Generate data rows
  const rows = items.map(item => {
    return columns.map(col => {
      if (col.getValue) {
        return escapeField(col.getValue(item, sections, concepts));
      }
      const key = col.key as keyof T;
      const value = item[key];
      return escapeField(value as string);
    }).join(',');
  });
  
  // Combine into CSV content
  const csvContent = [headers, ...rows].join('\n');
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-defined column configurations for common content types
export const FLASHCARD_EXPORT_COLUMNS: ExportColumn<{
  title: string;
  content?: { front?: string; back?: string };
  front?: string;
  back?: string;
  section_id?: string | null;
}>[] = [
  { key: 'title', header: 'title' },
  { 
    key: 'front', 
    header: 'front',
    getValue: (item) => item.content?.front || (item as any).front || ''
  },
  { 
    key: 'back', 
    header: 'back',
    getValue: (item) => item.content?.back || (item as any).back || ''
  },
  {
    key: 'concept_name',
    header: 'concept_name',
    getValue: (item, _sections, concepts) => resolveConceptName((item as any).concept_id, concepts || [])
  },
  {
    key: 'section_name',
    header: 'section_name',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).name
  },
  {
    key: 'section_number',
    header: 'section_number',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).number
  },
];

export const MCQ_EXPORT_COLUMNS: ExportColumn<{
  stem: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  choice_e?: string;
  correct_answer: string;
  explanation?: string;
  difficulty?: string;
  section_id?: string | null;
}>[] = [
  { key: 'stem', header: 'stem' },
  { key: 'choice_a', header: 'choiceA' },
  { key: 'choice_b', header: 'choiceB' },
  { key: 'choice_c', header: 'choiceC' },
  { key: 'choice_d', header: 'choiceD' },
  { key: 'choice_e', header: 'choiceE' },
  { key: 'correct_answer', header: 'correct_key' },
  { key: 'explanation', header: 'explanation' },
  { key: 'difficulty', header: 'difficulty' },
  {
    key: 'concept_name',
    header: 'concept_name',
    getValue: (item, _sections, concepts) => resolveConceptName((item as any).concept_id, concepts || [])
  },
  {
    key: 'section_name',
    header: 'section_name',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).name
  },
  {
    key: 'section_number',
    header: 'section_number',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).number
  },
];

export const LECTURE_EXPORT_COLUMNS: ExportColumn<{
  title: string;
  duration?: string;
  video_url?: string;
  section_id?: string | null;
}>[] = [
  { key: 'title', header: 'title' },
  { key: 'duration', header: 'duration' },
  { key: 'video_url', header: 'video_url' },
  {
    key: 'concept_name',
    header: 'concept_name',
    getValue: (item, _sections, concepts) => resolveConceptName((item as any).concept_id, concepts || [])
  },
  {
    key: 'section_name',
    header: 'section_name',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).name
  },
  {
    key: 'section_number',
    header: 'section_number',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).number
  },
];

export const ESSAY_EXPORT_COLUMNS: ExportColumn<{
  title: string;
  question: string;
  model_answer?: string;
  section_id?: string | null;
}>[] = [
  { key: 'title', header: 'title' },
  { key: 'question', header: 'question' },
  { key: 'model_answer', header: 'model_answer' },
  {
    key: 'concept_name',
    header: 'concept_name',
    getValue: (item, _sections, concepts) => resolveConceptName((item as any).concept_id, concepts || [])
  },
  {
    key: 'section_name',
    header: 'section_name',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).name
  },
  {
    key: 'section_number',
    header: 'section_number',
    getValue: (item, sections) => resolveSectionInfo(item.section_id, sections || []).number
  },
];
