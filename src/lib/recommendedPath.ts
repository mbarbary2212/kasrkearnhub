/**
 * Recommended Study Path (Session 4: migrated to ChapterStatus)
 *
 * Maps chapter status to recommended sections/tabs.
 * Mode-aware — recommends learning, practice, or assessment
 * based on STATUS_MODE_RATIOS from learningModes.ts.
 */

import type { ChapterStatus } from '@/lib/readiness';
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
  /** Primary learning mode for this status */
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

/** Status-specific guidance messages */
const STATUS_MESSAGES: Record<ChapterStatus, string> = {
  not_started: 'Start with Socrates and videos to build your foundation.',
  started: 'Continue learning with explanations before moving to practice.',
  needs_attention: 'Review with Socrates and guided explanations before practicing.',
  building: 'Mix learning and practice to strengthen your understanding.',
  ready: 'Keep practicing and start testing yourself.',
  strong: 'Test yourself with exam-style questions to confirm mastery.',
};

/**
 * Derive a recommended study path from the current chapter status.
 * Mode-aware: uses centralized STATUS_MODE_RATIOS to determine recommendations.
 */
export function getRecommendedPath(status: ChapterStatus): PathRecommendation {
  const primaryMode = getPrimaryMode(status);
  const modeConfig = getModeConfigForState(status);
  const orderedModes = getOrderedModes(status);

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
    message: STATUS_MESSAGES[status] ?? 'Start exploring this chapter.',
    recommendedSections,
    primaryMode,
  };
}

/** Map ChapterStatus to a human-friendly label */
export function getStatusLabel(status: ChapterStatus): string {
  switch (status) {
    case 'not_started': return 'Not Started';
    case 'started': return 'Getting Started';
    case 'needs_attention': return 'Needs Attention';
    case 'building': return 'Building';
    case 'ready': return 'Ready';
    case 'strong': return 'Strong';
    default: return '';
  }
}

/**
 * @deprecated Use getStatusLabel instead.
 */
export const getStateLabel = getStatusLabel;
