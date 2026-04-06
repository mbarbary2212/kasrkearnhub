/**
 * Unified Readiness System — Standalone Classifier
 *
 * Extracted from engine.ts so that any consumer can derive a canonical
 * ChapterStatus without running the full engine pipeline.
 *
 * Two entry points:
 *   1. classifyChapterStatus() — pure function, takes pre-computed scores.
 *   2. classifyFromMetrics()   — TEMPORARY migration utility that builds a
 *      ChapterReadinessInput from a StudentChapterMetric row and runs the
 *      engine. Prefer consuming the full ChapterReadinessResult long-term.
 */

import {
  STATUS_THRESHOLDS,
  COMPETENCY_GUARDRAILS,
} from './config';
import type {
  ChapterStatus,
  EvidenceLevel,
} from './types';

// ============================================================================
// Core classifier — used by the engine and available standalone
// ============================================================================

/**
 * Determine the canonical ChapterStatus from readiness engine outputs.
 *
 * This is the SINGLE source of truth for status classification.
 */
export function classifyChapterStatus(
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
// Migration utility — classifyFromMetrics
// ============================================================================

/**
 * @temporary Migration utility for Session 4.
 *
 * Derives a native ChapterStatus directly from a StudentChapterMetric row
 * by constructing an approximate ChapterReadinessInput and running the
 * full engine pipeline.
 *
 * **Long-term consumers should use ChapterReadinessResult.chapterStatus**
 * from the readiness engine / useChapterReadiness hook instead.
 *
 * This function will be removed once all consumers are wired to the
 * engine output (Phase 2).
 */
export function classifyFromMetrics(m: {
  coverage_percent: number;
  mcq_attempts: number;
  mcq_accuracy: number;
  recent_mcq_accuracy: number;
  readiness_score: number;
  flashcards_due?: number;
  flashcards_overdue?: number;
  last_activity_at?: string | null;
  confidence_mismatch_rate?: number;
  overconfident_error_rate?: number;
}): ChapterStatus {
  // --- Derive component scores from available metric fields ---

  // Engagement: approximate from coverage_percent (until full engine wiring)
  const engagementScore = Math.max(0, Math.min(100, m.coverage_percent));

  // Performance: recent_mcq_accuracy (null if no attempts)
  const recentAccuracy = m.mcq_attempts > 0 ? m.recent_mcq_accuracy : null;
  const totalAttempts = m.mcq_attempts;

  // Retention: derive from flashcard state
  let retentionScore: number | null = null;
  if (m.flashcards_overdue != null || m.flashcards_due != null) {
    if ((m.flashcards_overdue ?? 0) > 0) retentionScore = 20;
    else if ((m.flashcards_due ?? 0) > 0) retentionScore = 60;
    else retentionScore = 100;
  }

  // Consistency: from last_activity_at
  let consistencyScore: number | null = null;
  if (m.last_activity_at) {
    const daysSince = (Date.now() - new Date(m.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 3) consistencyScore = 100;
    else if (daysSince < 7) consistencyScore = 70;
    else consistencyScore = 30;
  }

  // Confidence: from mismatch rate
  let confidenceScore: number | null = null;
  if (m.confidence_mismatch_rate != null) {
    confidenceScore = Math.max(0, Math.min(100, 100 - m.confidence_mismatch_rate));
  }

  // --- Count active components for evidence level ---
  const activeCount = [
    engagementScore > 0 ? 1 : 0,
    recentAccuracy != null ? 1 : 0,
    retentionScore != null ? 1 : 0,
    consistencyScore != null ? 1 : 0,
    confidenceScore != null ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Determine evidence level
  let evidenceLevel: EvidenceLevel;
  if (activeCount >= 5) evidenceLevel = 'strong';
  else if (activeCount >= 3) evidenceLevel = 'moderate';
  else if (activeCount >= 1) evidenceLevel = 'low';
  else evidenceLevel = 'none';

  // --- Compute approximate readiness score ---
  // Use the same weighted formula with redistribution
  const WEIGHTS = { engagement: 0.25, performance: 0.35, retention: 0.20, consistency: 0.10, confidence: 0.10 };
  const components: { key: string; value: number; weight: number }[] = [];

  if (engagementScore > 0) components.push({ key: 'engagement', value: engagementScore, weight: WEIGHTS.engagement });
  if (recentAccuracy != null) components.push({ key: 'performance', value: recentAccuracy, weight: WEIGHTS.performance });
  if (retentionScore != null) components.push({ key: 'retention', value: retentionScore, weight: WEIGHTS.retention });
  if (consistencyScore != null) components.push({ key: 'consistency', value: consistencyScore, weight: WEIGHTS.consistency });
  if (confidenceScore != null) components.push({ key: 'confidence', value: confidenceScore, weight: WEIGHTS.confidence });

  let readinessScore = 0;
  if (components.length > 0) {
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    readinessScore = components.reduce((sum, c) => sum + c.value * (c.weight / totalWeight), 0);
  }

  // Evidence cap
  const EVIDENCE_CAPS = { none: 0, low: 40, moderate: 75, strong: 100 };
  readinessScore = Math.min(readinessScore, EVIDENCE_CAPS[evidenceLevel]);

  // Zero-state guard
  if (engagementScore < COMPETENCY_GUARDRAILS.zeroStateEngagement && totalAttempts === 0) {
    readinessScore = 0;
  }

  readinessScore = Math.round(Math.max(0, Math.min(100, readinessScore)));

  return classifyChapterStatus(
    readinessScore,
    evidenceLevel,
    engagementScore,
    recentAccuracy,
    totalAttempts,
  );
}
