/**
 * Recommended Study Path — maps chapter state to recommended sections/tabs.
 *
 * Uses the existing ChapterState from classifyChapterState.ts.
 * Phase 2.5: Now mode-aware — recommends learning, practice, or assessment
 * based on STATE_MODE_RATIOS from learningModes.ts.
 */

import type { ChapterState } from '@/lib/studentMetrics';
import { getPrimaryMode, getModeConfigForState, getOrderedModes, MODE_CONFIGS, type LearningMode } from '@/lib/learningModes';

export type SectionMode = 'resources' | 'interactive' | 'practice' | 'test';

export interface PathRecommendation {
  /** Primary section the student should focus on */
  primarySection: SectionMode;
  /** Recommended sub-tabs within that section */
  recommendedTabs: string[];
  /** Short guidance message */
  message: string;
  /** All recommended sections (for subtle emphasis) */
  recommendedSections: SectionMode[];
  /** Primary learning mode for this state */
  primaryMode: LearningMode;
}

/** Map LearningMode → SectionMode for navigation */
function modeToSection(mode: LearningMode): SectionMode {
  switch (mode) {
    case 'learning': return 'resources';
    case 'practice': return 'practice';
    case 'assessment': return 'test';
  }
}

/** State-specific guidance messages */
const STATE_MESSAGES: Record<ChapterState, string> = {
  not_started: 'Start with Socrates and videos to build your foundation.',
  early: 'Continue learning with explanations before moving to practice.',
  weak: 'Review with Socrates and guided explanations before practicing.',
  unstable: 'Mix learning and practice to strengthen your understanding.',
  in_progress: 'Keep practicing and start testing yourself.',
  strong: 'Test yourself with exam-style questions to confirm mastery.',
};

/**
 * Derive a recommended study path from the current chapter state.
 * Mode-aware: uses centralized STATE_MODE_RATIOS to determine recommendations.
 */
export function getRecommendedPath(state: ChapterState): PathRecommendation {
  const primaryMode = getPrimaryMode(state);
  const modeConfig = getModeConfigForState(state);
  const orderedModes = getOrderedModes(state);

  const primarySection = modeToSection(primaryMode);
  const recommendedSections = orderedModes.map(m => modeToSection(m.mode));

  // Build recommended tabs from all active modes (primary first)
  const recommendedTabs: string[] = [];
  for (const { mode } of orderedModes) {
    for (const tab of MODE_CONFIGS[mode].defaultTabs) {
      if (!recommendedTabs.includes(tab)) {
        recommendedTabs.push(tab);
      }
    }
  }

  return {
    primarySection,
    recommendedTabs,
    message: STATE_MESSAGES[state] ?? 'Start exploring this chapter.',
    recommendedSections,
    primaryMode,
  };
}

/** Map ChapterState to a human-friendly label */
export function getStateLabel(state: ChapterState): string {
  switch (state) {
    case 'not_started': return 'Not Started';
    case 'early': return 'Getting Started';
    case 'weak': return 'Needs Review';
    case 'unstable': return 'Needs Practice';
    case 'in_progress': return 'In Progress';
    case 'strong': return 'Strong';
    default: return '';
  }
}
