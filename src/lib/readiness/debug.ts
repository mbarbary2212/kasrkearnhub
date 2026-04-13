/**
 * Session 8 — Observability & Configuration Diagnostics
 *
 * Utilities for inspecting readiness calculations, identifying data gaps,
 * and surfacing the active configuration. Designed for admin panels,
 * debug overlays, and logging.
 */

import {
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
import { URGENCY_SORT_ORDER } from './reviewUrgency';
import type {
  ChapterReadinessInput,
  ChapterReadinessResult,
  ComponentName,
  DataGapDiagnostic,
  ReadinessDebugSnapshot,
} from './types';

// ============================================================================
// Component metadata
// ============================================================================

const COMPONENT_KEYS: ComponentName[] = [
  'engagement', 'performance', 'retention', 'consistency', 'confidence',
];

const COMPONENT_DATA_SOURCES: Record<ComponentName, string> = {
  engagement: 'Content views, video watch %, text dwell time, flashcard sessions',
  performance: 'MCQ accuracy (recent attempts), total attempt count',
  retention: 'Flashcard review state, spaced-repetition metrics',
  consistency: 'Activity regularity over rolling window',
  confidence: 'Confidence calibration (confident-but-wrong rate)',
};

// ============================================================================
// Debug Snapshot
// ============================================================================

/**
 * Build a structured debug snapshot from engine input + output.
 * Use for admin inspection panels, logging, or export.
 */
export function buildDebugSnapshot(
  input: ChapterReadinessInput,
  result: ChapterReadinessResult,
): ReadinessDebugSnapshot {
  const activeCount = COMPONENT_KEYS.length - result.missingComponents.length;

  // Compute raw (uncapped) weighted sum for transparency
  let rawWeightedSum = 0;
  for (const key of COMPONENT_KEYS) {
    rawWeightedSum += result.componentScores[key] * result.effectiveWeights[key];
  }

  return {
    version: CALCULATION_VERSION,
    chapterId: result.chapterId,
    moduleId: result.moduleId,
    timestamp: new Date().toISOString(),

    input: {
      engagementPercent: input.engagementPercent,
      recentAccuracy: input.recentAccuracy,
      totalAttempts: input.totalAttempts,
      retentionScore: input.retentionScore,
      consistencyScore: input.consistencyScore,
      confidenceScore: input.confidenceScore,
      daysSinceLastActivity: input.daysSinceLastActivity,
      hasOverdueFlashcards: input.hasOverdueFlashcards,
      overconfidentErrorRate: input.overconfidentErrorRate,
    },

    scoring: {
      componentScores: { ...result.componentScores },
      baseWeights: { ...COMPONENT_WEIGHTS },
      effectiveWeights: { ...result.effectiveWeights },
      activeComponents: COMPONENT_KEYS.filter(k => !result.missingComponents.includes(k)),
      missingComponents: [...result.missingComponents],
      rawWeightedSum: Math.round(rawWeightedSum * 100) / 100,
      evidenceLevel: result.evidenceLevel,
      evidenceCap: EVIDENCE_CAPS[result.evidenceLevel],
      finalScore: result.readinessScore,
    },

    classification: {
      chapterStatus: result.chapterStatus,
      reviewUrgency: result.reviewUrgency,
      reviewReason: result.reviewReason,
      riskFlags: result.riskFlags.map(f => ({
        flag: f.flag,
        severity: f.severity,
        description: f.description,
      })),
    },

    narratives: {
      insightMessage: result.insightMessage,
      secondaryHint: result.secondaryHint,
      nextBestAction: result.nextBestAction,
    },

    diagnostics: {
      activeComponentCount: activeCount,
      totalComponentCount: COMPONENT_KEYS.length,
      dataCompleteness: Math.round((activeCount / COMPONENT_KEYS.length) * 100),
      cappedByEvidence: result.readinessScore < rawWeightedSum,
      limitingFactors: identifyLimitingFactors(result),
    },
  };
}

// ============================================================================
// Data Gap Diagnostics
// ============================================================================

/**
 * Analyse which data signals are missing or weak for a given chapter.
 * Returns actionable items for admin review or student guidance.
 */
export function diagnoseDataGaps(
  input: ChapterReadinessInput,
  result: ChapterReadinessResult,
): DataGapDiagnostic[] {
  const gaps: DataGapDiagnostic[] = [];

  for (const key of COMPONENT_KEYS) {
    const isMissing = result.missingComponents.includes(key);
    const score = result.componentScores[key];
    const weight = COMPONENT_WEIGHTS[key];

    if (isMissing) {
      gaps.push({
        component: key,
        severity: weight >= 0.20 ? 'critical' : 'moderate',
        issue: `No data available for ${key}.`,
        dataSource: COMPONENT_DATA_SOURCES[key],
        impact: `Weight (${(weight * 100).toFixed(0)}%) is redistributed to other components, potentially inflating or deflating the score.`,
        suggestion: getSuggestionForMissing(key),
      });
    } else if (score === 0) {
      gaps.push({
        component: key,
        severity: 'moderate',
        issue: `${key} score is 0 despite having data.`,
        dataSource: COMPONENT_DATA_SOURCES[key],
        impact: `Contributes 0 to the weighted sum, dragging the score down.`,
        suggestion: `Verify that ${key} data is being collected and calculated correctly.`,
      });
    }
  }

  // Contextual gaps
  if (input.daysSinceLastActivity == null) {
    gaps.push({
      component: null,
      severity: 'minor',
      issue: 'daysSinceLastActivity is null — inactivity signals unavailable.',
      dataSource: 'Last activity timestamp from any content interaction',
      impact: 'Review urgency defaults to 0 days, potentially masking inactivity.',
      suggestion: 'Ensure activity timestamps are tracked and passed to the engine.',
    });
  }

  if (input.overconfidentErrorRate == null && input.totalAttempts >= 5) {
    gaps.push({
      component: 'confidence',
      severity: 'minor',
      issue: 'Overconfident error rate is null despite having practice attempts.',
      dataSource: 'Confidence tagging on MCQ answers',
      impact: 'Cannot detect overconfidence risk flag.',
      suggestion: 'Enable confidence tagging on practice questions.',
    });
  }

  return gaps;
}

// ============================================================================
// Active Configuration Summary
// ============================================================================

/**
 * Return the full active configuration as a single serializable object.
 * Useful for admin panels, export, or comparing across versions.
 */
export function getActiveConfig() {
  return {
    calculationVersion: CALCULATION_VERSION,
    componentWeights: { ...COMPONENT_WEIGHTS },
    evidenceCaps: { ...EVIDENCE_CAPS },
    evidenceThresholds: { ...EVIDENCE_THRESHOLDS },
    statusThresholds: { ...STATUS_THRESHOLDS },
    competencyGuardrails: { ...COMPETENCY_GUARDRAILS },
    meaningfulThresholds: { ...MEANINGFUL_THRESHOLDS },
    engagementSourceWeights: { ...ENGAGEMENT_SOURCE_WEIGHTS },
    reviewUrgencyThresholds: { ...REVIEW_URGENCY_THRESHOLDS },
    riskFlagThresholds: { ...RISK_FLAG_THRESHOLDS },
    urgencySortOrder: { ...URGENCY_SORT_ORDER },
  } as const;
}

// ============================================================================
// Internal helpers
// ============================================================================

function identifyLimitingFactors(result: ChapterReadinessResult): string[] {
  const factors: string[] = [];

  // Evidence cap
  if (result.evidenceLevel !== 'strong') {
    factors.push(`Evidence level '${result.evidenceLevel}' caps score at ${EVIDENCE_CAPS[result.evidenceLevel]}`);
  }

  // Missing high-weight components
  for (const comp of result.missingComponents) {
    if (COMPONENT_WEIGHTS[comp] >= 0.20) {
      factors.push(`Missing '${comp}' (weight: ${(COMPONENT_WEIGHTS[comp] * 100).toFixed(0)}%)`);
    }
  }

  // Low-scoring active components
  const activeComponents = COMPONENT_KEYS.filter(
    k => !result.missingComponents.includes(k),
  );
  for (const comp of activeComponents) {
    if (result.componentScores[comp] < 30) {
      factors.push(`'${comp}' score is very low (${result.componentScores[comp]})`);
    }
  }

  // Risk flags
  for (const flag of result.riskFlags) {
    if (flag.severity === 'high') {
      factors.push(`High-severity flag: ${flag.flag}`);
    }
  }

  return factors;
}

function getSuggestionForMissing(component: ComponentName): string {
  switch (component) {
    case 'engagement':
      return 'Start tracking content views, video progress, and text interactions.';
    case 'performance':
      return 'Complete some practice questions to generate performance data.';
    case 'retention':
      return 'Begin flashcard reviews to build retention signals.';
    case 'consistency':
      return 'Activity needs to span multiple sessions to measure consistency.';
    case 'confidence':
      return 'Enable confidence ratings on practice questions.';
    default:
      return 'Ensure data collection is active for this component.';
  }
}
