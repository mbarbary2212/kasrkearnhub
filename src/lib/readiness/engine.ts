/**
 * Unified Readiness Engine — Core Calculator
 * 
 * Single function that computes chapter readiness from raw inputs.
 * 
 * Session 1: core scoring with dynamic weight redistribution + evidence caps.
 * Session 4: classifier extracted to classify.ts.
 * Session 5: risk flags & narrative insights wired in.
 */

import {
  CALCULATION_VERSION,
  COMPONENT_WEIGHTS,
  EVIDENCE_CAPS,
  EVIDENCE_THRESHOLDS,
  COMPETENCY_GUARDRAILS,
} from './config';
import { classifyChapterStatus } from './classify';
import { detectRiskFlags, generateNarratives } from './narratives';
import { determineReviewUrgency } from './reviewUrgency';
import type {
  ChapterReadinessInput,
  ChapterReadinessResult,
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
  for (const key of COMPONENT_KEYS) {
    if (activeComponents.has(key)) {
      activeWeightSum += COMPONENT_WEIGHTS[key];
    }
  }

  // Redistribute: each active component gets its original weight
  // scaled up so all active weights sum to 1.0
  for (const key of COMPONENT_KEYS) {
    if (activeComponents.has(key)) {
      weights[key] = COMPONENT_WEIGHTS[key] / activeWeightSum;
    }
  }

  return weights;
}

// Classification extracted to classify.ts — Session 4

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
  const chapterStatus = classifyChapterStatus(
    readinessScore,
    evidenceLevel,
    finalScores.engagement,
    input.recentAccuracy,
    input.totalAttempts,
  );

  // 9. Detect risk flags (Session 5)
  const riskFlags = detectRiskFlags(finalScores, input, evidenceLevel);

  // 10. Generate narrative insights (Session 5)
  const narratives = generateNarratives(
    chapterStatus,
    finalScores,
    riskFlags,
    input,
    evidenceLevel,
  );

  // 11. Build result (reviewUrgency populated in Session 7)
  return {
    readinessScore,
    chapterStatus,
    componentScores: finalScores,
    effectiveWeights,
    missingComponents,
    evidenceLevel,

    riskFlags,
    reviewUrgency: 'on_track' as const,  // stub — Session 7
    reviewReason: '',                      // stub — Session 7
    nextBestAction: narratives.nextBestAction,
    insightMessage: narratives.insightMessage,
    secondaryHint: narratives.secondaryHint,

    calculationVersion: CALCULATION_VERSION,
    chapterId: input.chapterId,
    moduleId: input.moduleId,
  };
}
