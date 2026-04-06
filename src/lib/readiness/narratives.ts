/**
 * Unified Readiness System — Session 5: Risk Flags & Narrative Insights
 *
 * Two public functions:
 *   1. detectRiskFlags()    — returns RiskFlag[] from component scores & input
 *   2. generateNarratives() — returns insightMessage, secondaryHint, nextBestAction
 *
 * All outputs are concise and designed for direct use in dashboard cards,
 * chapter summaries, and Study Coach blocks.
 */

import { RISK_FLAG_THRESHOLDS } from './config';
import type {
  ChapterReadinessInput,
  ChapterStatus,
  ComponentScores,
  EvidenceLevel,
  RiskFlag,
  RiskFlagType,
  RiskSeverity,
} from './types';

// ============================================================================
// Risk Flag Detection
// ============================================================================

/** Priority order — first flag = strongest limiting factor */
const FLAG_PRIORITY: RiskFlagType[] = [
  'weak_performance',
  'overdue_revision',
  'low_engagement',
  'inconsistent_activity',
  'overconfident_errors',
  'low_evidence',
];

export function detectRiskFlags(
  scores: ComponentScores,
  input: ChapterReadinessInput,
  evidenceLevel: EvidenceLevel,
): RiskFlag[] {
  const t = RISK_FLAG_THRESHOLDS;
  const flags: RiskFlag[] = [];

  // weak_performance — low accuracy with enough attempts
  if (
    input.recentAccuracy != null &&
    input.recentAccuracy < t.weakPerformanceAccuracy &&
    input.totalAttempts >= t.weakPerformanceMinAttempts
  ) {
    const severity: RiskSeverity = input.recentAccuracy < 30 ? 'high' : 'medium';
    flags.push({
      flag: 'weak_performance',
      severity,
      description: `Recent accuracy is ${Math.round(input.recentAccuracy)}%, below the ${t.weakPerformanceAccuracy}% threshold.`,
    });
  }

  // overdue_revision — overdue flashcards or long inactivity on retention
  if (input.hasOverdueFlashcards) {
    const severity: RiskSeverity =
      input.daysSinceLastActivity != null && input.daysSinceLastActivity >= t.overdueRevisionDays
        ? 'high'
        : 'medium';
    flags.push({
      flag: 'overdue_revision',
      severity,
      description: 'Flashcards are overdue for review.',
    });
  }

  // low_engagement — coverage/engagement below threshold
  if (scores.engagement < t.lowEngagement) {
    flags.push({
      flag: 'low_engagement',
      severity: scores.engagement === 0 ? 'high' : 'medium',
      description: `Content engagement is only ${Math.round(scores.engagement)}%.`,
    });
  }

  // inconsistent_activity — consistency score below threshold
  if (scores.consistency < t.inconsistentConsistency && scores.consistency > 0) {
    flags.push({
      flag: 'inconsistent_activity',
      severity: 'medium',
      description: 'Study activity has been irregular recently.',
    });
  }

  // overconfident_errors — high overconfident error rate
  if (
    input.overconfidentErrorRate != null &&
    input.overconfidentErrorRate >= t.overconfidentErrorRate
  ) {
    const severity: RiskSeverity = input.overconfidentErrorRate >= 50 ? 'high' : 'medium';
    flags.push({
      flag: 'overconfident_errors',
      severity,
      description: `Overconfident error rate is ${Math.round(input.overconfidentErrorRate)}%.`,
    });
  }

  // low_evidence — not enough data components to assess properly
  if (evidenceLevel === 'none' || evidenceLevel === 'low') {
    flags.push({
      flag: 'low_evidence',
      severity: evidenceLevel === 'none' ? 'low' : 'low',
      description: 'Not enough activity data to assess this chapter reliably.',
    });
  }

  // Sort by canonical priority
  flags.sort(
    (a, b) => FLAG_PRIORITY.indexOf(a.flag) - FLAG_PRIORITY.indexOf(b.flag),
  );

  return flags;
}

// ============================================================================
// Narrative Insights
// ============================================================================

export interface NarrativeOutput {
  insightMessage: string;
  secondaryHint: string | null;
  nextBestAction: string;
}

/**
 * Generate concise coaching narratives from readiness data.
 *
 * Logic is driven by the strongest limiting factor (first risk flag)
 * combined with chapter status for positive-path messaging.
 */
export function generateNarratives(
  status: ChapterStatus,
  scores: ComponentScores,
  riskFlags: RiskFlag[],
  input: ChapterReadinessInput,
  evidenceLevel: EvidenceLevel,
): NarrativeOutput {
  // Early exit: not started
  if (status === 'not_started') {
    return {
      insightMessage: 'You haven\'t started this chapter yet.',
      secondaryHint: 'Begin with the core content to build a foundation.',
      nextBestAction: 'Start learning',
    };
  }

  // Identify primary limiting factor (first flag by priority)
  const primaryFlag = riskFlags.length > 0 ? riskFlags[0].flag : null;

  // ── Insight message ──────────────────────────────────────────
  const insight = buildInsightMessage(status, scores, primaryFlag, input);

  // ── Secondary hint ───────────────────────────────────────────
  const hint = buildSecondaryHint(status, primaryFlag, riskFlags, scores);

  // ── Next best action ─────────────────────────────────────────
  const action = buildNextBestAction(status, primaryFlag, scores, input);

  return {
    insightMessage: insight,
    secondaryHint: hint,
    nextBestAction: action,
  };
}

// ── Insight builders ─────────────────────────────────────────────

function buildInsightMessage(
  status: ChapterStatus,
  scores: ComponentScores,
  primaryFlag: RiskFlagType | null,
  input: ChapterReadinessInput,
): string {
  // Flag-driven messages (limiting factor first)
  if (primaryFlag === 'weak_performance') {
    if (scores.engagement >= 50) {
      return 'You are active in this chapter, but your accuracy still needs work.';
    }
    return 'This chapter needs attention because your recent performance is weak.';
  }

  if (primaryFlag === 'overdue_revision') {
    return 'You started this chapter but your revision is falling behind.';
  }

  if (primaryFlag === 'low_engagement') {
    if (input.recentAccuracy != null && input.recentAccuracy >= 65) {
      return 'You are performing well but have not covered enough content yet.';
    }
    return 'This chapter has low content coverage — focus on the core material.';
  }

  if (primaryFlag === 'inconsistent_activity') {
    return 'Your study pattern for this chapter has been inconsistent.';
  }

  if (primaryFlag === 'overconfident_errors') {
    return 'You are making errors on questions you rated as confident.';
  }

  if (primaryFlag === 'low_evidence') {
    return 'There is not enough data yet to assess this chapter reliably.';
  }

  // Status-driven messages (positive path)
  switch (status) {
    case 'strong':
      return 'Great progress — maintain this chapter with light review.';
    case 'ready':
      return 'You are well prepared — consider testing yourself under exam conditions.';
    case 'building':
      return 'You are making steady progress — keep building your understanding.';
    case 'needs_attention':
      return 'This chapter needs focused effort to improve your performance.';
    case 'started':
      return 'You have begun this chapter — continue building your foundation.';
    default:
      return 'Keep working through this chapter.';
  }
}

function buildSecondaryHint(
  status: ChapterStatus,
  primaryFlag: RiskFlagType | null,
  riskFlags: RiskFlag[],
  scores: ComponentScores,
): string | null {
  // Don't add a hint if things are going well with no flags
  if (riskFlags.length === 0 && (status === 'strong' || status === 'ready')) {
    return null;
  }

  if (primaryFlag === 'weak_performance') {
    return 'Review missed concepts before your next practice block.';
  }

  if (primaryFlag === 'overdue_revision') {
    return 'A short review now may prevent forgetting later.';
  }

  if (primaryFlag === 'low_engagement') {
    return 'Finish the core content before doing more questions.';
  }

  if (primaryFlag === 'inconsistent_activity') {
    return 'Even 15 minutes of regular study helps retention.';
  }

  if (primaryFlag === 'overconfident_errors') {
    return 'Slow down on confident answers and double-check reasoning.';
  }

  // Secondary flag hint if there are multiple flags
  if (riskFlags.length >= 2) {
    const secondFlag = riskFlags[1].flag;
    if (secondFlag === 'overdue_revision') return 'Also check your overdue flashcards.';
    if (secondFlag === 'low_engagement') return 'Also consider covering more content.';
  }

  // Status-based fallbacks
  if (status === 'building' && scores.retention < 50) {
    return 'Start reviewing flashcards to strengthen retention.';
  }

  if (status === 'started') {
    return 'Focus on understanding before moving to practice.';
  }

  return null;
}

function buildNextBestAction(
  status: ChapterStatus,
  primaryFlag: RiskFlagType | null,
  scores: ComponentScores,
  input: ChapterReadinessInput,
): string {
  // Flag-driven actions (most limiting first)
  if (primaryFlag === 'weak_performance') return 'Revisit weak questions';
  if (primaryFlag === 'overdue_revision') return 'Review overdue flashcards';
  if (primaryFlag === 'low_engagement') return 'Finish core content';
  if (primaryFlag === 'inconsistent_activity') return 'Do a short study session';
  if (primaryFlag === 'overconfident_errors') return 'Redo confident-but-wrong questions';
  if (primaryFlag === 'low_evidence') return 'Complete more activities';

  // Status-driven actions (positive path)
  switch (status) {
    case 'strong':
      return 'Continue — progress is stable';
    case 'ready':
      return 'Try an exam-style practice set';
    case 'building':
      if (scores.performance < 60) return 'Do 10 more MCQs';
      if (scores.retention < 50) return 'Review flashcards';
      return 'Keep practising';
    case 'needs_attention':
      return 'Focus on weak areas';
    case 'started':
      return 'Continue learning';
    default:
      return 'Start learning';
  }
}
