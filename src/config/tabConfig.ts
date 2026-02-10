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
  MessageCircleQuestion,
  ToggleLeft,
} from 'lucide-react';

// Unified tab configuration for the entire app
// Every topic/chapter uses the same structure regardless of department or year

// Resource tab types - includes Guided Explanations (Socratic method)
export type ResourceTabId = 'lectures' | 'flashcards' | 'mind_maps' | 'guided_explanations' | 'reference_materials' | 'clinical_tools';

// Practice tab types (formerly "Self-Assessment")
// Note: "Learning Unit" is the internal term for Chapter/Lecture - never expose to users
// Consolidated: cases, virtual_patient, worked_case → clinical_cases
export type PracticeTabId = 'mcqs' | 'true_false' | 'essays' | 'clinical_cases' | 'osce' | 'practical' | 'matching' | 'images';

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Standard Resources tabs - same for all modules/departments
// Guided Explanations uses Socratic method for discovery learning
// Documents renamed to Reference Materials for clarity
export const RESOURCES_TABS: TabConfig[] = [
  { id: 'lectures', label: 'Videos', icon: Video },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'mind_maps', label: 'Visual Summaries', icon: Network },
  { id: 'guided_explanations', label: 'Guided Explanations', icon: MessageCircleQuestion },
  { id: 'reference_materials', label: 'Reference Materials', icon: FileText },
  { id: 'clinical_tools', label: 'Clinical Tools', icon: GitBranch },
];

// Standard Practice tabs - same for all modules/departments
// Consolidated: "Case Scenarios" and "Virtual Patient" → "Clinical Cases"
export const PRACTICE_TABS: TabConfig[] = [
  { id: 'mcqs', label: 'MCQs', icon: HelpCircle },
  { id: 'true_false', label: 'True/False', icon: ToggleLeft },
  { id: 'essays', label: 'Short Answer', icon: PenTool },
  { id: 'clinical_cases', label: 'Clinical Cases', icon: Stethoscope },
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
  mind_maps?: number;
  guided_explanations?: number;
  reference_materials?: number;
  clinical_tools?: number;
}): TabWithCount[] {
  return RESOURCES_TABS.map(tab => ({
    ...tab,
    count: counts[tab.id as keyof typeof counts] ?? 0,
  }));
}

export function createPracticeTabs(counts: {
  mcqs?: number;
  true_false?: number;
  essays?: number;
  clinical_cases?: number;
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
