/**
 * Centralised chapter progress calculation.
 * Single source of truth consumed by useChapterProgress and useContentProgress.
 */

import {
  COMPONENT_WEIGHTS,
  EVIDENCE_CAPS,
  EVIDENCE_THRESHOLDS,
  STATUS_THRESHOLDS,
  COMPETENCY_GUARDRAILS,
  MEANINGFUL_THRESHOLDS,
  ENGAGEMENT_SOURCE_WEIGHTS,
} from '@/lib/readiness/config';

export type ChapterStatus =
  | 'not_started'
  | 'started'
  | 'building'
  | 'ready'
  | 'strong'
  | 'needs_attention';

export interface ChapterProgressInput {
  chapterId: string;
  // Engagement
  videosWatched: number;       // count of videos watched >= MEANINGFUL_THRESHOLDS.videoWatchPercent
  totalVideos: number;
  textsRead: number;           // count of text items with dwell >= MEANINGFUL_THRESHOLDS.textDwellSeconds
  totalTexts: number;
  flashcardsReviewed: number;  // sessions where >= MEANINGFUL_THRESHOLDS.flashcardMinBatch cards reviewed
  totalFlashcardSessions: number;
  practiceSessions: number;    // sessions where >= MEANINGFUL_THRESHOLDS.practiceMinQuestions attempted
  totalPracticeSessions: number;
  // Performance
  mcqAttempts: number;
  mcqCorrect: number;
  osceAttempts: number;
  osceAvgScore: number;        // 0–5 scale
  // Retention (spaced repetition proxy)
  reviewSessionsCompleted: number;
  reviewSessionsScheduled: number;
  daysSinceLastActivity: number | null;
  // Consistency
  studyDaysInLast14: number;   // days with at least one activity in last 14 days
  // Confidence (self-assessment or Socrates completion)
  socratesCompleted: number;
  socratesTotal: number;
}

export interface ChapterProgressResult {
  readiness: number;           // 0–100
  status: ChapterStatus;
  components: {
    engagement: number | null;
    performance: number | null;
    retention: number | null;
    consistency: number | null;
    confidence: number | null;
  };
  evidenceLevel: 'none' | 'low' | 'moderate' | 'strong';
  activeComponents: number;
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

function calcEngagement(input: ChapterProgressInput): number | null {
  const scores: (number | null)[] = [
    safeRatio(input.videosWatched, input.totalVideos),
    safeRatio(input.textsRead, input.totalTexts),
    safeRatio(input.flashcardsReviewed, input.totalFlashcardSessions),
    null, // visuals — no reliable tracking yet, exclude
    safeRatio(input.practiceSessions, input.totalPracticeSessions),
  ];
  const weights = [
    ENGAGEMENT_SOURCE_WEIGHTS.videos,
    ENGAGEMENT_SOURCE_WEIGHTS.text,
    ENGAGEMENT_SOURCE_WEIGHTS.flashcards,
    ENGAGEMENT_SOURCE_WEIGHTS.visuals,
    ENGAGEMENT_SOURCE_WEIGHTS.practice,
  ];

  let weightedSum = 0;
  let activeWeight = 0;
  scores.forEach((s, i) => {
    if (s !== null) {
      weightedSum += s * weights[i];
      activeWeight += weights[i];
    }
  });
  if (activeWeight === 0) return null;
  return Math.min(100, Math.round(weightedSum / activeWeight));
}

function calcPerformance(input: ChapterProgressInput): number | null {
  const hasMcq = input.mcqAttempts > 0;
  const hasOsce = input.osceAttempts > 0;
  if (!hasMcq && !hasOsce) return null;

  let score = 0;
  let weight = 0;

  if (hasMcq) {
    const accuracy = (input.mcqCorrect / input.mcqAttempts) * 100;
    score += accuracy * 0.6;
    weight += 0.6;
  }
  if (hasOsce) {
    const osceNorm = (input.osceAvgScore / 5) * 100;
    score += osceNorm * 0.4;
    weight += 0.4;
  }

  return Math.min(100, Math.round(score / weight));
}

function calcRetention(input: ChapterProgressInput): number | null {
  const reviewScore = safeRatio(
    input.reviewSessionsCompleted,
    input.reviewSessionsScheduled
  );
  if (reviewScore === null && input.daysSinceLastActivity === null) return null;

  let score = reviewScore ?? 50; // neutral if no scheduled reviews yet
  // Decay for inactivity
  const days = input.daysSinceLastActivity ?? 0;
  if (days > 14) score = Math.max(0, score - 30);
  else if (days > 7) score = Math.max(0, score - 15);

  return Math.min(100, Math.round(score));
}

function calcConsistency(input: ChapterProgressInput): number | null {
  // 14-day window — need at least 1 day of data to score
  if (input.studyDaysInLast14 === 0 && input.daysSinceLastActivity === null) return null;
  // 5 out of 14 days = 100%, scale accordingly
  const targetDays = 5;
  return Math.min(100, Math.round((input.studyDaysInLast14 / targetDays) * 100));
}

function calcConfidence(input: ChapterProgressInput): number | null {
  return safeRatio(input.socratesCompleted, input.socratesTotal);
}

function getEvidenceLevel(activeComponents: number): ChapterProgressResult['evidenceLevel'] {
  if (activeComponents === 0) return 'none';
  if (activeComponents < EVIDENCE_THRESHOLDS.moderate) return 'low';
  if (activeComponents < EVIDENCE_THRESHOLDS.strong) return 'moderate';
  return 'strong';
}

function capReadiness(raw: number, evidenceLevel: ChapterProgressResult['evidenceLevel']): number {
  return Math.min(raw, EVIDENCE_CAPS[evidenceLevel]);
}

function deriveStatus(
  readiness: number,
  evidenceLevel: ChapterProgressResult['evidenceLevel'],
  input: ChapterProgressInput,
  performance: number | null,
  engagement: number | null
): ChapterStatus {
  // Zero state
  if (evidenceLevel === 'none') return 'not_started';
  if (
    (engagement !== null && engagement < COMPETENCY_GUARDRAILS.zeroStateEngagement) &&
    input.mcqAttempts === 0 &&
    input.osceAttempts === 0
  ) {
    return 'not_started';
  }

  // Needs attention
  if (
    performance !== null &&
    input.mcqAttempts >= COMPETENCY_GUARDRAILS.minAttemptsForFlag &&
    performance < COMPETENCY_GUARDRAILS.needsAttentionAccuracy
  ) {
    return 'needs_attention';
  }

  // Positive statuses (require guardrails to pass)
  if (readiness >= STATUS_THRESHOLDS.strong) {
    const meetsAccuracy = performance === null || performance >= COMPETENCY_GUARDRAILS.strongMinAccuracy;
    const meetsEngagement = engagement === null || engagement >= COMPETENCY_GUARDRAILS.strongMinEngagement;
    if (meetsAccuracy && meetsEngagement) return 'strong';
    return 'ready'; // fall back
  }

  if (readiness >= STATUS_THRESHOLDS.ready) {
    const meetsAccuracy = performance === null || performance >= COMPETENCY_GUARDRAILS.readyMinAccuracy;
    const meetsEngagement = engagement === null || engagement >= COMPETENCY_GUARDRAILS.readyMinEngagement;
    if (meetsAccuracy && meetsEngagement) return 'ready';
    return 'building';
  }

  if (readiness >= STATUS_THRESHOLDS.building) return 'building';
  return 'started';
}

export function calculateChapterProgress(input: ChapterProgressInput): ChapterProgressResult {
  const engagement = calcEngagement(input);
  const performance = calcPerformance(input);
  const retention = calcRetention(input);
  const consistency = calcConsistency(input);
  const confidence = calcConfidence(input);

  const components = { engagement, performance, retention, consistency, confidence };
  const activeComponents = Object.values(components).filter(v => v !== null).length;
  const evidenceLevel = getEvidenceLevel(activeComponents);

  if (evidenceLevel === 'none') {
    return {
      readiness: 0,
      status: 'not_started',
      components,
      evidenceLevel,
      activeComponents,
    };
  }

  // Weighted composite
  const raw =
    (engagement ?? 0) * COMPONENT_WEIGHTS.engagement +
    (performance ?? 0) * COMPONENT_WEIGHTS.performance +
    (retention ?? 0) * COMPONENT_WEIGHTS.retention +
    (consistency ?? 0) * COMPONENT_WEIGHTS.consistency +
    (confidence ?? 0) * COMPONENT_WEIGHTS.confidence;

  const readiness = capReadiness(Math.round(raw), evidenceLevel);
  const status = deriveStatus(readiness, evidenceLevel, input, performance, engagement);

  return { readiness, status, components, evidenceLevel, activeComponents };
}
