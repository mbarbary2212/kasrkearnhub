/**
 * Unified Readiness Engine — Core Calculator
 * 
 * Single function that computes chapter readiness from raw inputs.
 * 
 * Session 1: core scoring with dynamic weight redistribution + evidence caps.
 * Engagement stubs to existing coverage_percent.
 * Classification is basic (refined in Session 4).
 * Risk flags / insights return defaults (populated in Session 5).
 */

import {
  CALCULATION_VERSION,
  COMPONENT_WEIGHTS,
  EVIDENCE_CAPS,
  EVIDENCE_THRESHOLDS,
  STATUS_THRESHOLDS,
  COMPETENCY_GUARDRAILS,
} from './config';
import type {
  ChapterReadinessInput,
  ChapterReadinessResult,
  ChapterStatus,
  ComponentName,
  ComponentScores,
  EffectiveWeights,
  EvidenceLevel,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

const COMPONENT_KEYS: ComponentName[] = [
  'engagement', 'performance', 'retention', 'consistency', 'confidence',
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Component Extraction
// ============================================================================

/**
 * Extract normalised component scores (0–100) from raw input.
 * Returns null for components with no data.
 */
function extractComponentScores(
  input: ChapterReadinessInput
): Record<ComponentName, number | null> {
  return {
    engagement: input.engagementPercent != null
      ? clamp(input.engagementPercent)
      : null,

    performance: input.recentAccuracy != null && input.totalAttempts > 0
      ? clamp(input.recentAccuracy)
      : null,

    retention: input.retentionScore != null
      ? clamp(input.retentionScore)
      : null,

    consistency: input.consistencyScore != null
      ? clamp(input.consistencyScore)
      : null,

    confidence: input.confidenceScore != null
      ? clamp(input.confidenceScore)
      : null,
  };
}

// ============================================================================
// Evidence Level
// ============================================================================

function determineEvidenceLevel(activeCount: number): EvidenceLevel {
  if (activeCount >= EVIDENCE_THRESHOLDS.strong) return 'strong';
  if (activeCount >= EVIDENCE_THRESHOLDS.moderate) return 'moderate';
  if (activeCount >= EVIDENCE_THRESHOLDS.low) return 'low';
  return 'none';
}

// ============================================================================
// Weight Redistribution
// ============================================================================

/**
 * Redistribute weights from missing components to active ones proportionally.
 * If no components are active, all weights are 0.
 */
function redistributeWeights(
  activeComponents: Set<ComponentName>
): EffectiveWeights {
  const weights: EffectiveWeights = {
    engagement: 0,
    performance: 0,
    retention: 0,
    consistency: 0,
    confidence: 0,
  };

  if (activeComponents.size === 0) return weights;

  // Sum weights of active components
  let activeWeightSum = 0;
  for (const key of activeComponents) {
    activeWeightSum += COMPONENT_WEIGHTS[key];
  }

  // Redistribute: each active component gets its original weight
  // scaled up so all active weights sum to 1.0
  for (const key of activeComponents) {
    weights[key] = COMPONENT_WEIGHTS[key] / activeWeightSum;
  }

  return weights;
}

// ============================================================================
// Basic Classification (refined in Session 4)
// ============================================================================

function classifyStatus(
  readinessScore: number,
  evidenceLevel: EvidenceLevel,
  engagementScore: number,
  recentAccuracy: number | null,
  totalAttempts: number,
): ChapterStatus {
  const g = COMPETENCY_GUARDRAILS;

  // Force not_started when no evidence or negligible activity
  if (evidenceLevel === 'none') return 'not_started';
  if (engagementScore < g.zeroStateEngagement && totalAttempts === 0) {
    return 'not_started';
  }

  // needs_attention override: low accuracy with enough attempts
  if (
    recentAccuracy != null &&
    recentAccuracy < g.needsAttentionAccuracy &&
    totalAttempts >= g.minAttemptsForFlag
  ) {
    return 'needs_attention';
  }

  // Evidence-constrained status
  if (
    readinessScore >= STATUS_THRESHOLDS.strong &&
    evidenceLevel === 'strong' &&
    (recentAccuracy == null || recentAccuracy >= g.strongMinAccuracy) &&
    engagementScore >= g.strongMinEngagement
  ) {
    return 'strong';
  }

  if (
    readinessScore >= STATUS_THRESHOLDS.ready &&
    (evidenceLevel === 'moderate' || evidenceLevel === 'strong') &&
    (recentAccuracy == null || recentAccuracy >= g.readyMinAccuracy) &&
    engagementScore >= g.readyMinEngagement
  ) {
    return 'ready';
  }

  if (readinessScore >= STATUS_THRESHOLDS.building) return 'building';
  return 'started';
}

// ============================================================================
// Main Calculator
// ============================================================================

export function calculateChapterReadiness(
  input: ChapterReadinessInput
): ChapterReadinessResult {
  // 1. Extract per-component scores (null = missing)
  const rawScores = extractComponentScores(input);

  // 2. Determine active components
  const activeComponents = new Set<ComponentName>();
  const missingComponents: ComponentName[] = [];
  const finalScores: ComponentScores = {
    engagement: 0,
    performance: 0,
    retention: 0,
    consistency: 0,
    confidence: 0,
  };

  for (const key of COMPONENT_KEYS) {
    const val = rawScores[key];
    if (val != null) {
      activeComponents.add(key);
      finalScores[key] = val;
    } else {
      missingComponents.push(key);
      finalScores[key] = 0; // missing = 0, NOT 100
    }
  }

  // 3. Evidence level
  const evidenceLevel = determineEvidenceLevel(activeComponents.size);

  // 4. Redistribute weights
  const effectiveWeights = redistributeWeights(activeComponents);

  // 5. Weighted sum
  let rawScore = 0;
  for (const key of COMPONENT_KEYS) {
    rawScore += finalScores[key] * effectiveWeights[key];
  }
  rawScore = Math.round(clamp(rawScore));

  // 6. Apply evidence cap
  const evidenceCap = EVIDENCE_CAPS[evidenceLevel];
  const cappedScore = Math.min(rawScore, evidenceCap);

  // 7. Zero-state guard
  const g = COMPETENCY_GUARDRAILS;
  const readinessScore =
    finalScores.engagement < g.zeroStateEngagement && input.totalAttempts === 0
      ? 0
      : cappedScore;

  // 8. Classify status
  const chapterStatus = classifyStatus(
    readinessScore,
    evidenceLevel,
    finalScores.engagement,
    input.recentAccuracy,
    input.totalAttempts,
  );

  // 9. Build result (risk flags, insights, review urgency are stubs for now)
  return {
    readinessScore,
    chapterStatus,
    componentScores: finalScores,
    effectiveWeights,
    missingComponents,
    evidenceLevel,

    // Stubs — populated in Session 5
    riskFlags: [],
    reviewUrgency: 'on_track',
    reviewReason: '',
    nextBestAction: '',
    insightMessage: '',
    secondaryHint: null,

    calculationVersion: CALCULATION_VERSION,
    chapterId: input.chapterId,
    moduleId: input.moduleId,
  };
}
