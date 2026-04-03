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
  GraduationCap,
  ToggleLeft,
} from 'lucide-react';

// Socrates icon image path for the Socrates tab
export const SOCRATES_ICON_PATH = '/socrates-icon.png';

// Unified tab configuration for the entire app
// Every topic/chapter uses the same structure regardless of department or year

// Resource tab types - includes Guided Explanations (Socratic method)
export type ResourceTabId = 'lectures' | 'flashcards' | 'mind_maps' | 'guided_explanations' | 'reference_materials' | 'clinical_tools';

// Interactive tab types — Cases + Pathways (positioned between Resources and Practice)
export type InteractiveTabId = 'cases' | 'pathways';

// Practice tab types (formerly "Self-Assessment")
// Note: "Learning Unit" is the internal term for Chapter/Lecture - never expose to users
// clinical_cases moved to Interactive section
export type PracticeTabId = 'mcqs' | 'sba' | 'true_false' | 'essays' | 'osce' | 'practical' | 'matching' | 'images';

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  useImageIcon?: boolean;
}

// Standard Resources tabs - same for all modules/departments
// Guided Explanations uses Socratic method for discovery learning
// Documents renamed to Reference Materials for clarity
export const RESOURCES_TABS: TabConfig[] = [
  { id: 'lectures', label: 'Videos', icon: Video },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'mind_maps', label: 'Visual Resources', icon: Network },
  { id: 'guided_explanations', label: 'Socrates', icon: GraduationCap, useImageIcon: true },
  { id: 'reference_materials', label: 'Reference Materials', icon: FileText },
  { id: 'clinical_tools', label: 'Clinical Tools', icon: GitBranch },
];

// Interactive tabs — Cases and Pathways
export const INTERACTIVE_TABS: TabConfig[] = [
  { id: 'cases', label: 'Cases', icon: Stethoscope },
  { id: 'pathways', label: 'Pathways', icon: GitBranch },
];

// Standard Practice tabs - same for all modules/departments
// clinical_cases moved to Interactive section
export const PRACTICE_TABS: TabConfig[] = [
  { id: 'mcqs', label: 'MCQs', icon: HelpCircle },
  { id: 'sba', label: 'SBA', icon: HelpCircle },
  { id: 'true_false', label: 'True/False', icon: ToggleLeft },
  { id: 'essays', label: 'Short Answer', icon: PenTool },
  { id: 'osce', label: 'OSCE', icon: FlaskConical },
  { id: 'practical', label: 'Practical', icon: Stethoscope },
  { id: 'matching', label: 'Matching', icon: Link2 },
  { id: 'images', label: 'Image Questions', icon: Image },
];

// Helper to add counts to tabs
export interface TabWithCount extends TabConfig {
  count: number;
  /** Optional split counts for composite tabs like Visual Resources */
  subcounts?: { label: string; count: number }[];
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

export function createInteractiveTabs(counts: {
  cases?: number;
  pathways?: number;
}): TabWithCount[] {
  return INTERACTIVE_TABS.map(tab => ({
    ...tab,
    count: counts[tab.id as keyof typeof counts] ?? 0,
  }));
}

export function createPracticeTabs(counts: {
  mcqs?: number;
  sba?: number;
  true_false?: number;
  essays?: number;
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
