/**
 * Unified Readiness System — Status Compatibility Bridge
 *
 * Maps between the new canonical ChapterStatus and the legacy ChapterState
 * used by consumers that haven't been fully migrated yet.
 *
 * @deprecated This module exists only for backward compatibility with
 * ClassificationDashboard, useChapterClassification, and useYearClassification.
 * It will be removed in Phase 2 when those consumers are rebuilt.
 */

import type { ChapterStatus } from './types';

/**
 * Legacy 6-state type from classifyChapterState.ts.
 * @deprecated Use ChapterStatus from readiness types instead.
 */
export type LegacyChapterState =
  | 'not_started'
  | 'early'
  | 'weak'
  | 'unstable'
  | 'in_progress'
  | 'strong';

/**
 * Map a canonical ChapterStatus to a legacy ChapterState.
 * @deprecated Temporary bridge — will be removed in Phase 2.
 */
export function mapStatusToLegacy(status: ChapterStatus): LegacyChapterState {
  switch (status) {
    case 'not_started':      return 'not_started';
    case 'started':          return 'early';
    case 'building':         return 'in_progress';
    case 'needs_attention':  return 'weak';
    case 'ready':            return 'in_progress';
    case 'strong':           return 'strong';
    default:                 return 'not_started';
  }
}

/**
 * Map a legacy ChapterState to the closest canonical ChapterStatus.
 * @deprecated Temporary bridge — will be removed in Phase 2.
 */
export function mapLegacyToStatus(legacy: LegacyChapterState): ChapterStatus {
  switch (legacy) {
    case 'not_started':  return 'not_started';
    case 'early':        return 'started';
    case 'weak':         return 'needs_attention';
    case 'unstable':     return 'building';
    case 'in_progress':  return 'building';
    case 'strong':       return 'strong';
    default:             return 'not_started';
  }
}
