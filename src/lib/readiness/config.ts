/**
 * Unified Readiness System — Centralized Configuration
 * 
 * All weights, thresholds, and constants in one place.
 * Future: admin-tunable via DB settings.
 */

// ============================================================================
// Version
// ============================================================================

export const CALCULATION_VERSION = '2.0.0';

// ============================================================================
// Component Weights (must sum to 1.0)
// ============================================================================

export const COMPONENT_WEIGHTS = {
  engagement: 0.25,
  performance: 0.35,
  retention: 0.20,
  consistency: 0.10,
  confidence: 0.10,
} as const;

// ============================================================================
// Evidence Level Caps
// Operational: directly constrain the maximum readiness score.
// ============================================================================

export const EVIDENCE_CAPS = {
  none: 0,       // 0 components with data → readiness forced to 0
  low: 40,       // 1–2 components → readiness capped at 40
  moderate: 75,  // 3–4 components → readiness capped at 75
  strong: 100,   // all 5 components → no cap
} as const;

/** Number of active components required for each evidence level */
export const EVIDENCE_THRESHOLDS = {
  low: 1,        // >= 1 component
  moderate: 3,   // >= 3 components
  strong: 5,     // all 5 components
} as const;

// ============================================================================
// Chapter Status Thresholds
// ============================================================================

export const STATUS_THRESHOLDS = {
  started: 0,          // > 0 readiness with evidence
  building: 25,        // >= 25
  ready: 65,           // >= 65 (subject to guardrails)
  strong: 85,          // >= 85 (subject to guardrails)
} as const;

// ============================================================================
// Competency Guardrails
// Prevent high status despite poor actual performance.
// ============================================================================

export const COMPETENCY_GUARDRAILS = {
  /** Minimum recent accuracy to qualify for 'ready' */
  readyMinAccuracy: 65,
  /** Minimum recent accuracy to qualify for 'strong' */
  strongMinAccuracy: 75,
  /** Minimum engagement to qualify for 'ready' */
  readyMinEngagement: 30,
  /** Minimum engagement to qualify for 'strong' */
  strongMinEngagement: 50,
  /** Below this engagement AND 0 attempts → force not_started */
  zeroStateEngagement: 5,
  /** Accuracy below this with >= minAttemptsForFlag attempts triggers needs_attention */
  needsAttentionAccuracy: 50,
  /** Minimum attempts before accuracy guardrails apply */
  minAttemptsForFlag: 5,
} as const;

// ============================================================================
// Meaningful Interaction Thresholds (anti-gaming)
// Content interaction below these thresholds is not counted.
// ============================================================================

export const MEANINGFUL_THRESHOLDS = {
  /** Video: minimum % of duration watched to count */
  videoWatchPercent: 70,
  /** Text/article: minimum dwell time in seconds (proxy until real tracking) */
  textDwellSeconds: 30,
  /** Flashcards: minimum cards reviewed in a session to count */
  flashcardMinBatch: 5,
  /** Practice: minimum questions attempted per session to count */
  practiceMinQuestions: 3,
  /** Cases: minimum completion to count */
  caseMinCompletion: true,
} as const;

// ============================================================================
// Engagement Source Weights (must sum to 1.0)
// Used in Session 2; defined here for centralization.
// ============================================================================

export const ENGAGEMENT_SOURCE_WEIGHTS = {
  videos: 0.35,
  text: 0.20,
  flashcards: 0.15,
  visuals: 0.10,
  practice: 0.20,
} as const;

// ============================================================================
// Review Urgency Thresholds
// Used in Session 7; defined here for centralization.
// ============================================================================

export const REVIEW_URGENCY_THRESHOLDS = {
  /** Days without activity to trigger review_now */
  reviewNowInactiveDays: 14,
  /** Days without activity to trigger review_soon */
  reviewSoonInactiveDays: 7,
} as const;

// ============================================================================
// Risk Flag Thresholds
// Used in Session 5; defined here for centralization.
// ============================================================================

export const RISK_FLAG_THRESHOLDS = {
  lowEngagement: 20,
  weakPerformanceAccuracy: 50,
  weakPerformanceMinAttempts: 5,
  overdueRevisionDays: 14,
  inconsistentConsistency: 30,
  overconfidentErrorRate: 25,
} as const;
