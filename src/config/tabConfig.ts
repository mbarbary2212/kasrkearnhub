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
  GitBranch,
  Network,
  User,
} from 'lucide-react';

// Unified tab configuration for the entire app
// Every topic/chapter uses the same structure regardless of department or year

// Resource tab types - Mind Maps now a main tab, Worked Cases moved under Clinical Tools
export type ResourceTabId = 'lectures' | 'flashcards' | 'mind_maps' | 'documents' | 'clinical_tools';

// Practice tab types (formerly "Self-Assessment")
// Note: "Learning Unit" is the internal term for Chapter/Lecture - never expose to users
export type PracticeTabId = 'mcqs' | 'essays' | 'cases' | 'osce' | 'practical' | 'matching' | 'images' | 'virtual_patient';

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Standard Resources tabs - same for all modules/departments
// Mind Maps is now a main tab, Worked Cases moved under Clinical Tools
export const RESOURCES_TABS: TabConfig[] = [
  { id: 'lectures', label: 'Videos', icon: Video },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'mind_maps', label: 'Mind Maps', icon: Network },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'clinical_tools', label: 'Clinical Tools', icon: GitBranch },
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
  { id: 'virtual_patient', label: 'Virtual Patient', icon: User },
];

// Helper to add counts to tabs
export interface TabWithCount extends TabConfig {
  count: number;
}

export function createResourceTabs(counts: {
  lectures?: number;
  flashcards?: number;
  mind_maps?: number;
  documents?: number;
  clinical_tools?: number;
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
  virtual_patient?: number;
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
