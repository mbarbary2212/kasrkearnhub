/**
 * Unified Readiness System — Type Definitions
 * 
 * Single source of truth for all readiness-related types.
 */

// ============================================================================
// Enums & Unions
// ============================================================================

export type EvidenceLevel = 'none' | 'low' | 'moderate' | 'strong';

export type ChapterStatus =
  | 'not_started'
  | 'started'
  | 'building'
  | 'needs_attention'
  | 'ready'
  | 'strong';

export type ReviewUrgency = 'review_now' | 'review_soon' | 'on_track' | 'low_priority';

export type RiskFlagType =
  | 'low_engagement'
  | 'weak_performance'
  | 'overdue_revision'
  | 'inconsistent_activity'
  | 'overconfident_errors'
  | 'low_evidence';

export type RiskSeverity = 'low' | 'medium' | 'high';

// ============================================================================
// Component Scores
// ============================================================================

/** All component scores normalized 0–100 */
export interface ComponentScores {
  engagement: number;
  performance: number;
  retention: number;
  consistency: number;
  confidence: number;
}

/** Component names as a union type for iteration */
export type ComponentName = keyof ComponentScores;

/** Effective weights after redistribution (sum = 1.0 when any data present) */
export type EffectiveWeights = Record<ComponentName, number>;

// ============================================================================
// Risk Flags
// ============================================================================

export interface RiskFlag {
  flag: RiskFlagType;
  severity: RiskSeverity;
  description: string;
}

// ============================================================================
// Engine Input
// ============================================================================

/**
 * Raw data needed by the readiness engine.
 * Consumers (hooks) are responsible for fetching and shaping this.
 */
export interface ChapterReadinessInput {
  chapterId: string;
  moduleId: string;

  // Engagement (Session 1 stub: uses coveragePercent; Session 2 replaces)
  engagementPercent: number | null;

  // Performance
  recentAccuracy: number | null;     // 0–100, from recent MCQ attempts
  totalAttempts: number;             // total MCQ attempts

  // Retention
  retentionScore: number | null;     // 0–100, from flashcard/review state

  // Consistency
  consistencyScore: number | null;   // 0–100, from activity regularity

  // Confidence calibration
  confidenceScore: number | null;    // 0–100, calibration accuracy

  // Contextual data for guardrails & flags (used in later sessions)
  daysSinceLastActivity: number | null;
  hasOverdueFlashcards: boolean;
  overconfidentErrorRate: number | null; // 0–100
}

// ============================================================================
// Engine Output
// ============================================================================

export interface ChapterReadinessResult {
  // Core score
  readinessScore: number;             // 0–100, after caps

  // Status
  chapterStatus: ChapterStatus;

  // Component detail
  componentScores: ComponentScores;
  effectiveWeights: EffectiveWeights;
  missingComponents: ComponentName[];

  // Evidence
  evidenceLevel: EvidenceLevel;

  // Risk & coaching (populated in Session 5)
  riskFlags: RiskFlag[];
  reviewUrgency: ReviewUrgency;
  reviewReason: string;
  nextBestAction: string;

  // Narrative (populated in Session 5)
  insightMessage: string;
  secondaryHint: string | null;

  // Metadata
  calculationVersion: string;
  chapterId: string;
  moduleId: string;
}

// ============================================================================
// Module-Level Output (Session 6)
// ============================================================================

export interface ModuleReadinessResult {
  moduleReadiness: number;             // 0–100
  chapterCount: number;
  startedCount: number;
  topContributors: string[];           // chapter IDs
  weakestChapters: string[];           // chapter IDs
  mainLimitingComponent: ComponentName | null;
  calculationVersion: string;
}

// ============================================================================
// Review Urgency Output (Session 7)
// ============================================================================

export interface ReviewUrgencyResult {
  urgency: ReviewUrgency;
  reason: string;
  suggestedAction: string;
}

// ============================================================================
// Observability / Debug (Session 8)
// ============================================================================

/** Full debug snapshot of a single chapter readiness calculation */
export interface ReadinessDebugSnapshot {
  version: string;
  chapterId: string;
  moduleId: string;
  timestamp: string;

  input: {
    engagementPercent: number | null;
    recentAccuracy: number | null;
    totalAttempts: number;
    retentionScore: number | null;
    consistencyScore: number | null;
    confidenceScore: number | null;
    daysSinceLastActivity: number | null;
    hasOverdueFlashcards: boolean;
    overconfidentErrorRate: number | null;
  };

  scoring: {
    componentScores: ComponentScores;
    baseWeights: Record<ComponentName, number>;
    effectiveWeights: Record<ComponentName, number>;
    activeComponents: ComponentName[];
    missingComponents: ComponentName[];
    rawWeightedSum: number;
    evidenceLevel: EvidenceLevel;
    evidenceCap: number;
    finalScore: number;
  };

  classification: {
    chapterStatus: ChapterStatus;
    reviewUrgency: ReviewUrgency;
    reviewReason: string;
    riskFlags: Array<{ flag: string; severity: string; description: string }>;
  };

  narratives: {
    insightMessage: string;
    secondaryHint: string | null;
    nextBestAction: string;
  };

  diagnostics: {
    activeComponentCount: number;
    totalComponentCount: number;
    dataCompleteness: number;
    cappedByEvidence: boolean;
    limitingFactors: string[];
  };
}

/** Diagnostic for a single data gap or weak signal */
export interface DataGapDiagnostic {
  component: ComponentName | null;
  severity: 'critical' | 'moderate' | 'minor';
  issue: string;
  dataSource: string;
  impact: string;
  suggestion: string;
}
