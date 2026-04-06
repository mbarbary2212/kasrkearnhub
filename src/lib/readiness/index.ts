/**
 * Unified Readiness System — Public API
 */

// Engine
export { calculateChapterReadiness } from './engine';

// Classifier (Session 4)
export { classifyChapterStatus, classifyFromMetrics } from './classify';

// Risk flags & narratives (Session 5)
export { detectRiskFlags, generateNarratives } from './narratives';
export type { NarrativeOutput } from './narratives';

// Compatibility bridge (deprecated — Phase 2 removal)
export { mapStatusToLegacy, mapLegacyToStatus } from './statusCompat';
export type { LegacyChapterState } from './statusCompat';

// Module aggregation (Session 6)
export { calculateModuleReadiness } from './moduleReadiness';

// Review urgency (Session 7)
export { determineReviewUrgency, URGENCY_SORT_ORDER } from './reviewUrgency';

// Engagement
export {
  calculateEngagement,
  mapRpcToEngagementData,
} from './engagement';

// Config (for consumers that need thresholds, e.g. debug panel)
export {
  CALCULATION_VERSION,
  COMPONENT_WEIGHTS,
  EVIDENCE_CAPS,
  EVIDENCE_THRESHOLDS,
  STATUS_THRESHOLDS,
  COMPETENCY_GUARDRAILS,
  MEANINGFUL_THRESHOLDS,
  ENGAGEMENT_SOURCE_WEIGHTS,
  REVIEW_URGENCY_THRESHOLDS,
  RISK_FLAG_THRESHOLDS,
} from './config';

// Types
export type {
  EvidenceLevel,
  ChapterStatus,
  ReviewUrgency,
  RiskFlagType,
  RiskSeverity,
  ComponentScores,
  ComponentName,
  EffectiveWeights,
  RiskFlag,
  ChapterReadinessInput,
  ChapterReadinessResult,
  ModuleReadinessResult,
  ReviewUrgencyResult,
} from './types';

export type {
  EngagementSourceData,
  EngagementSourceBreakdown,
  EngagementResult,
  RpcProgressForEngagement,
} from './engagement';
