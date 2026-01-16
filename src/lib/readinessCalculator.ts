/**
 * Unified Readiness Calculator
 * 
 * Single source of truth for all student readiness calculations.
 * Used by useStudentDashboard, useChapterProgress, and any other hook
 * that needs to calculate student readiness or performance.
 * 
 * FORMULA:
 * Exam Readiness = 0.40 * Coverage + 0.30 * Performance + 0.20 * Improvement + 0.10 * Consistency
 * 
 * CAPS:
 * - Coverage < 40% → Readiness max 50%
 * - Performance < 50% → Readiness max 65%
 * - Improvement < 40% → Readiness max 75%
 */

// ============================================================================
// Types
// ============================================================================

export interface PerformanceInput {
  mcq: { accuracy: number; attempts: number };
  osce: { avgScore: number; attempts: number }; // avgScore is 0-5 scale
  conceptCheck: { passRate: number; total: number };
}

export interface ImprovementInput {
  mcqRecent: { correct: number; total: number }[];
  mcqPrior: { correct: number; total: number }[];
  osceRecent: number[]; // scores 0-5
  oscePrior: number[]; // scores 0-5
}

export interface ReadinessComponents {
  coverage: number;      // 0-100
  performance: number;   // 0-100
  improvement: number;   // 0-100 (50 = no change, >50 = improving)
  consistency: number;   // 0-100
}

export interface ReadinessCap {
  type: 'coverage' | 'performance' | 'improvement' | null;
  threshold: number;
  maxReadiness: number;
}

export interface ReadinessResult {
  examReadiness: number;
  components: ReadinessComponents;
  cap: ReadinessCap | null;
  rawScore: number;
  breakdown: {
    coverageContribution: number;
    performanceContribution: number;
    improvementContribution: number;
    consistencyContribution: number;
  };
}

export type MasteryLevel = 'mastered' | 'needs_improvement' | 'not_attempted';

export interface MasteryIndicator {
  level: MasteryLevel;
  label: string;
  color: 'green' | 'yellow' | 'gray';
}

// ============================================================================
// Constants
// ============================================================================

export const READINESS_WEIGHTS = {
  coverage: 0.40,
  performance: 0.30,
  improvement: 0.20,
  consistency: 0.10,
} as const;

export const READINESS_CAPS = {
  lowCoverage: { threshold: 40, maxReadiness: 50 },
  lowPerformance: { threshold: 50, maxReadiness: 65 },
  decliningImprovement: { threshold: 40, maxReadiness: 75 },
} as const;

export const PERFORMANCE_WEIGHTS = {
  mcq: 0.50,
  osce: 0.30,
  conceptCheck: 0.20,
} as const;

export const MIN_ATTEMPTS_FOR_IMPROVEMENT = {
  mcq: 5,
  osce: 2,
} as const;

export const MASTERY_THRESHOLDS = {
  mcq: 70,        // % accuracy for mastery
  osce: 3.5,      // score out of 5 for mastery
  conceptCheck: 70, // % pass rate for mastery
} as const;

export const ENGAGEMENT_THRESHOLDS = {
  video: 80,      // % watched for "completed"
  mcq: 1,         // minimum attempts
  osce: 1,        // minimum attempts
} as const;

// ============================================================================
// Performance Calculation
// ============================================================================

/**
 * Calculate performance score (0-100) based on MCQ, OSCE, and Concept Check results.
 * Uses weight redistribution when a component has no attempts.
 */
export function calculatePerformance(input: PerformanceInput): number {
  const { mcq, osce, conceptCheck } = input;
  
  // Determine which components have data
  const hasMcq = mcq.attempts > 0;
  const hasOsce = osce.attempts > 0;
  const hasConceptCheck = conceptCheck.total > 0;
  
  // If no data at all, return 0
  if (!hasMcq && !hasOsce && !hasConceptCheck) {
    return 0;
  }
  
  // Calculate available weight and redistribute
  let totalWeight = 0;
  if (hasMcq) totalWeight += PERFORMANCE_WEIGHTS.mcq;
  if (hasOsce) totalWeight += PERFORMANCE_WEIGHTS.osce;
  if (hasConceptCheck) totalWeight += PERFORMANCE_WEIGHTS.conceptCheck;
  
  // Calculate weighted performance with redistribution
  let weightedScore = 0;
  
  if (hasMcq) {
    const mcqWeight = PERFORMANCE_WEIGHTS.mcq / totalWeight;
    weightedScore += mcq.accuracy * mcqWeight;
  }
  
  if (hasOsce) {
    const osceWeight = PERFORMANCE_WEIGHTS.osce / totalWeight;
    // Convert OSCE score from 0-5 to 0-100 scale
    const oscePercent = (osce.avgScore / 5) * 100;
    weightedScore += oscePercent * osceWeight;
  }
  
  if (hasConceptCheck) {
    const ccWeight = PERFORMANCE_WEIGHTS.conceptCheck / totalWeight;
    weightedScore += conceptCheck.passRate * ccWeight;
  }
  
  return Math.round(weightedScore);
}

// ============================================================================
// Improvement Calculation
// ============================================================================

/**
 * Calculate improvement score (0-100) based on recent vs prior attempts.
 * 50 = no change, >50 = improving, <50 = declining.
 * 
 * Uses attempt-based comparison (last N vs prior N) instead of day-based.
 */
export function calculateImprovement(input: ImprovementInput): number {
  const { mcqRecent, mcqPrior, osceRecent, oscePrior } = input;
  
  // Check if we have enough attempts
  const hasMcqData = mcqRecent.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.mcq && 
                     mcqPrior.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.mcq;
  const hasOsceData = osceRecent.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.osce && 
                      oscePrior.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.osce;
  
  // If no sufficient data, return neutral (50)
  if (!hasMcqData && !hasOsceData) {
    return 50;
  }
  
  let totalChange = 0;
  let totalWeight = 0;
  
  if (hasMcqData) {
    const recentCorrect = mcqRecent.reduce((sum, a) => sum + a.correct, 0);
    const recentTotal = mcqRecent.reduce((sum, a) => sum + a.total, 0);
    const priorCorrect = mcqPrior.reduce((sum, a) => sum + a.correct, 0);
    const priorTotal = mcqPrior.reduce((sum, a) => sum + a.total, 0);
    
    const recentAccuracy = recentTotal > 0 ? (recentCorrect / recentTotal) * 100 : 0;
    const priorAccuracy = priorTotal > 0 ? (priorCorrect / priorTotal) * 100 : 0;
    
    // MCQ change contribution (60% weight)
    totalChange += (recentAccuracy - priorAccuracy) * 0.6;
    totalWeight += 0.6;
  }
  
  if (hasOsceData) {
    const recentAvg = osceRecent.reduce((sum, s) => sum + s, 0) / osceRecent.length;
    const priorAvg = oscePrior.reduce((sum, s) => sum + s, 0) / oscePrior.length;
    
    // OSCE change contribution (40% weight), scaled from 0-5 to meaningful %
    // A 1 point improvement on 5-point scale = 20% improvement
    totalChange += (recentAvg - priorAvg) * 20 * 0.4;
    totalWeight += 0.4;
  }
  
  // If we only have one type of data, normalize to its weight
  if (totalWeight > 0 && totalWeight < 1) {
    totalChange = totalChange / totalWeight;
  }
  
  // Map to 0-100 scale centered at 50
  // -20 to +20 change maps to 0 to 100
  const improvementScore = Math.max(0, Math.min(100, 50 + (totalChange * 2.5)));
  
  return Math.round(improvementScore);
}

// ============================================================================
// Readiness Calculation
// ============================================================================

/**
 * Calculate final exam readiness score with weighted components and caps.
 */
export function calculateReadiness(components: ReadinessComponents): ReadinessResult {
  const { coverage, performance, improvement, consistency } = components;
  
  // Calculate weighted contributions
  const coverageContribution = coverage * READINESS_WEIGHTS.coverage;
  const performanceContribution = performance * READINESS_WEIGHTS.performance;
  const improvementContribution = improvement * READINESS_WEIGHTS.improvement;
  const consistencyContribution = consistency * READINESS_WEIGHTS.consistency;
  
  const rawScore = coverageContribution + performanceContribution + 
                   improvementContribution + consistencyContribution;
  
  // Determine applicable cap (strictest wins)
  let cap: ReadinessCap | null = null;
  let finalScore = rawScore;
  
  // Check coverage cap first (most restrictive)
  if (coverage < READINESS_CAPS.lowCoverage.threshold) {
    const maxScore = READINESS_CAPS.lowCoverage.maxReadiness;
    if (finalScore > maxScore) {
      finalScore = maxScore;
      cap = {
        type: 'coverage',
        threshold: READINESS_CAPS.lowCoverage.threshold,
        maxReadiness: maxScore,
      };
    }
  }
  
  // Check performance cap
  if (performance < READINESS_CAPS.lowPerformance.threshold && 
      (cap === null || READINESS_CAPS.lowPerformance.maxReadiness < cap.maxReadiness)) {
    const maxScore = READINESS_CAPS.lowPerformance.maxReadiness;
    if (rawScore > maxScore && (finalScore > maxScore || cap === null)) {
      finalScore = maxScore;
      cap = {
        type: 'performance',
        threshold: READINESS_CAPS.lowPerformance.threshold,
        maxReadiness: maxScore,
      };
    }
  }
  
  // Check improvement cap (only if there's actual declining performance)
  if (improvement < READINESS_CAPS.decliningImprovement.threshold && 
      improvement !== 50 && // 50 means neutral/no data
      (cap === null || READINESS_CAPS.decliningImprovement.maxReadiness < finalScore)) {
    const maxScore = READINESS_CAPS.decliningImprovement.maxReadiness;
    if (rawScore > maxScore && (finalScore > maxScore || cap === null)) {
      finalScore = maxScore;
      cap = {
        type: 'improvement',
        threshold: READINESS_CAPS.decliningImprovement.threshold,
        maxReadiness: maxScore,
      };
    }
  }
  
  return {
    examReadiness: Math.round(finalScore),
    components,
    cap,
    rawScore: Math.round(rawScore),
    breakdown: {
      coverageContribution: Math.round(coverageContribution),
      performanceContribution: Math.round(performanceContribution),
      improvementContribution: Math.round(improvementContribution),
      consistencyContribution: Math.round(consistencyContribution),
    },
  };
}

// ============================================================================
// Mastery Indicators
// ============================================================================

/**
 * Determine mastery level based on performance scores.
 * Used for chapter mastery badges.
 */
export function getMasteryIndicator(
  mcqAccuracy: number | null,
  osceAvgScore: number | null,
  hasAttempts: boolean
): MasteryIndicator {
  if (!hasAttempts) {
    return {
      level: 'not_attempted',
      label: 'Not attempted',
      color: 'gray',
    };
  }
  
  // Check if meeting mastery thresholds
  const mcqMastered = mcqAccuracy === null || mcqAccuracy >= MASTERY_THRESHOLDS.mcq;
  const osceMastered = osceAvgScore === null || osceAvgScore >= MASTERY_THRESHOLDS.osce;
  
  if (mcqMastered && osceMastered) {
    return {
      level: 'mastered',
      label: 'Good performance',
      color: 'green',
    };
  }
  
  return {
    level: 'needs_improvement',
    label: 'Needs improvement',
    color: 'yellow',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get empty readiness result for unauthenticated users or no data.
 */
export function getEmptyReadinessResult(): ReadinessResult {
  return {
    examReadiness: 0,
    components: {
      coverage: 0,
      performance: 0,
      improvement: 50,
      consistency: 0,
    },
    cap: null,
    rawScore: 0,
    breakdown: {
      coverageContribution: 0,
      performanceContribution: 0,
      improvementContribution: 0,
      consistencyContribution: 0,
    },
  };
}

/**
 * Format readiness cap message for display.
 */
export function getCapMessage(cap: ReadinessCap | null): string | null {
  if (!cap) return null;
  
  switch (cap.type) {
    case 'coverage':
      return `Capped at ${cap.maxReadiness}% because coverage is below ${cap.threshold}%`;
    case 'performance':
      return `Capped at ${cap.maxReadiness}% because performance is below ${cap.threshold}%`;
    case 'improvement':
      return `Capped at ${cap.maxReadiness}% due to declining performance`;
    default:
      return null;
  }
}

/**
 * Get readiness status label based on score.
 */
export function getReadinessStatus(score: number): {
  label: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
} {
  if (score >= 80) return { label: 'Excellent', color: 'green' };
  if (score >= 60) return { label: 'On Track', color: 'yellow' };
  if (score >= 40) return { label: 'Needs Attention', color: 'orange' };
  return { label: 'At Risk', color: 'red' };
}
