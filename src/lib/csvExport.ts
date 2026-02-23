import type { Section } from '@/hooks/useSections';

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  getValue?: (item: T, sections?: Section[]) => string;
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
  // Priority 1: Match by section_number (now stored as TEXT, e.g., "3.1", "3.10")
  if (sectionNumber !== undefined && sectionNumber !== '') {
    const sectionNumStr = String(sectionNumber).trim();
    if (sectionNumStr) {
      const match = sections.find(s => s.section_number === sectionNumStr);
      if (match) return match.id;
    }
  }
  
  // Priority 2: Match by section_name (case-insensitive)
  if (sectionName && sectionName.trim()) {
    const match = sections.find(s => 
      s.name.toLowerCase().trim() === sectionName.toLowerCase().trim()
    );
    if (match) return match.id;
  }
  
  return null;
}

// Generic CSV export function
export function exportToCsv<T>(
  items: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sections?: Section[]
): void {
  // Generate header row
  const headers = columns.map(col => escapeField(col.header)).join(',');
  
  // Generate data rows
  const rows = items.map(item => {
    return columns.map(col => {
      if (col.getValue) {
        return escapeField(col.getValue(item, sections));
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
  content: { front?: string; back?: string };
  section_id?: string | null;
}>[] = [
  { key: 'title', header: 'title' },
  { 
    key: 'front', 
    header: 'front',
    getValue: (item) => item.content?.front || ''
  },
  { 
    key: 'back', 
    header: 'back',
    getValue: (item) => item.content?.back || ''
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
  keywords?: string[] | null;
  rating?: number | null;
  section_id?: string | null;
  question_type?: string | null;
  rubric_json?: Record<string, unknown> | null;
  max_points?: number | null;
}>[] = [
  { key: 'title', header: 'title' },
  { key: 'question', header: 'question' },
  { key: 'model_answer', header: 'model_answer' },
  {
    key: 'keywords',
    header: 'keywords',
    getValue: (item) => (item.keywords || []).join('|'),
  },
  {
    key: 'rating',
    header: 'rating',
    getValue: (item) => item.rating != null ? String(item.rating) : '',
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
  {
    key: 'question_type',
    header: 'question_type',
    getValue: (item) => item.question_type || '',
  },
  {
    key: 'rubric_json',
    header: 'rubric_json',
    getValue: (item) => item.rubric_json ? JSON.stringify(item.rubric_json) : '',
  },
  {
    key: 'max_points',
    header: 'max_points',
    getValue: (item) => item.max_points != null ? String(item.max_points) : '',
  },
];
