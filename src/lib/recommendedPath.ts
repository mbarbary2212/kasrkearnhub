/**
 * Recommended Study Path — maps chapter state to recommended sections/tabs.
 *
 * Uses the existing ChapterState from classifyChapterState.ts.
 * Does NOT create a second classification system.
 */

import type { ChapterState } from '@/lib/studentMetrics';

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
}

/**
 * Derive a recommended study path from the current chapter state.
 */
export function getRecommendedPath(state: ChapterState): PathRecommendation {
  switch (state) {
    case 'not_started':
    case 'early':
      return {
        primarySection: 'resources',
        recommendedTabs: ['lectures', 'guided_explanations', 'flashcards'],
        message: 'Start with videos and guided explanations to build your foundation.',
        recommendedSections: ['resources'],
      };

    case 'weak':
      return {
        primarySection: 'resources',
        recommendedTabs: ['lectures', 'guided_explanations', 'mind_maps'],
        message: 'Review the material and guided explanations before practicing.',
        recommendedSections: ['resources', 'interactive'],
      };

    case 'unstable':
      return {
        primarySection: 'practice',
        recommendedTabs: ['mcqs', 'sba', 'true_false'],
        message: 'Practice more to strengthen your understanding.',
        recommendedSections: ['practice'],
      };

    case 'in_progress':
      return {
        primarySection: 'practice',
        recommendedTabs: ['mcqs', 'sba', 'cases'],
        message: 'Keep practicing to build consistency.',
        recommendedSections: ['practice', 'interactive'],
      };

    case 'strong':
      return {
        primarySection: 'test',
        recommendedTabs: ['mcqs', 'osce', 'essays'],
        message: 'Test yourself with exam-style questions.',
        recommendedSections: ['test', 'practice'],
      };

    default:
      return {
        primarySection: 'resources',
        recommendedTabs: ['lectures'],
        message: 'Start exploring this chapter.',
        recommendedSections: ['resources'],
      };
  }
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
