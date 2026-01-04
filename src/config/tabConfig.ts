import { 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  FlaskConical,
  Stethoscope,
  Layers,
  Image,
  Link2,
  LucideIcon,
} from 'lucide-react';

// Unified tab configuration for the entire app
// Every topic/chapter uses the same structure regardless of department or year

// Resource tab types
export type ResourceTabId = 'lectures' | 'flashcards' | 'documents';

// Self-assessment tab types (Practice tabs)
export type PracticeTabId = 'mcqs' | 'essays' | 'cases' | 'osce' | 'practical' | 'matching' | 'images';

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Standard Resources tabs - same for all modules/departments
export const RESOURCES_TABS: TabConfig[] = [
  { id: 'lectures', label: 'Videos', icon: Video },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'documents', label: 'Documents', icon: FileText },
];

// Standard Practice tabs - same for all modules/departments
export const PRACTICE_TABS: TabConfig[] = [
  { id: 'mcqs', label: 'MCQs', icon: HelpCircle },
  { id: 'essays', label: 'Short Answer', icon: PenTool },
  { id: 'cases', label: 'Case Scenarios', icon: Stethoscope },
  { id: 'osce', label: 'OSCE', icon: FlaskConical },
  { id: 'practical', label: 'Practical', icon: Stethoscope },
  { id: 'matching', label: 'Matching', icon: Link2 },
  { id: 'images', label: 'Image Questions', icon: Image },
];

// Helper to add counts to tabs
export interface TabWithCount extends TabConfig {
  count: number;
}

export function createResourceTabs(counts: {
  lectures?: number;
  flashcards?: number;
  documents?: number;
}): TabWithCount[] {
  return RESOURCES_TABS.map(tab => ({
    ...tab,
    count: counts[tab.id as keyof typeof counts] ?? 0,
  }));
}

export function createPracticeTabs(counts: {
  mcqs?: number;
  essays?: number;
  cases?: number;
  osce?: number;
  practical?: number;
  matching?: number;
  images?: number;
}): TabWithCount[] {
  return PRACTICE_TABS.map(tab => ({
    ...tab,
    count: counts[tab.id as keyof typeof counts] ?? 0,
  }));
}

// Filter tabs for student view (hide empty tabs when setting is enabled)
export function filterTabsForStudent(
  tabs: TabWithCount[],
  hideEmptyTabs: boolean
): TabWithCount[] {
  if (!hideEmptyTabs) return tabs;
  return tabs.filter(tab => tab.count > 0);
}
