/**
 * Unified Readiness System — Public API
 */

// Engine
export { calculateChapterReadiness } from './engine';

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
