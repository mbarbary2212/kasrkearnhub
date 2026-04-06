/**
 * Unified Readiness System — Multi-Source Engagement Calculator
 * 
 * Replaces video-only coverage_percent with a weighted engagement score
 * across 5 content sources: videos, text/articles, flashcards, visuals, practice.
 * 
 * Only meaningful interactions count (anti-gaming).
 * 
 * Data sources:
 * - Videos:      get_content_progress RPC → lectures + video_progress
 * - Text:        content_views (first-view proxy; dwell time not yet tracked)
 * - Flashcards:  get_content_progress RPC → flashcard_reviewed / flashcard_total
 * - Visuals:     get_content_progress RPC → mind_map, guided, pathway, clinical_tool, reference
 * - Practice:    get_content_progress RPC → mcq, essay, osce, case, matching, tf
 */

import {
  ENGAGEMENT_SOURCE_WEIGHTS,
  MEANINGFUL_THRESHOLDS,
} from './config';

// ============================================================================
// Types
// ============================================================================

export interface EngagementSourceData {
  // Videos
  videosCompleted: number;  // videos watched past meaningful threshold
  videosTotal: number;

  // Text/articles (viewed = proxy for meaningful read)
  textViewed: number;       // articles/text resources viewed (content_views)
  textTotal: number;        // currently 0 if no text resources exist

  // Flashcards
  flashcardsReviewed: number;  // cards reviewed
  flashcardsTotal: number;

  // Visual resources (mind maps, guided explanations, pathways, clinical tools, reference)
  visualsViewed: number;
  visualsTotal: number;

  // Practice (mcq, essay, osce, case, matching, tf)
  practiceCompleted: number;
  practiceTotal: number;
}

export interface EngagementSourceBreakdown {
  source: keyof typeof ENGAGEMENT_SOURCE_WEIGHTS;
  weight: number;
  effectiveWeight: number;
  rawPercent: number;        // 0–100 completion within this source
  contribution: number;      // weighted contribution to final score
  hasContent: boolean;       // whether this source has any available content
}

export interface EngagementResult {
  engagementPercent: number;  // 0–100 final score
  sourceBreakdown: EngagementSourceBreakdown[];
  missingTracking: string[];  // data sources we can't fully track yet
  sourcesWithContent: number;
  totalSources: number;
}

// ============================================================================
// Source Keys
// ============================================================================

type SourceKey = keyof typeof ENGAGEMENT_SOURCE_WEIGHTS;

const SOURCE_KEYS: SourceKey[] = ['videos', 'text', 'flashcards', 'visuals', 'practice'];

// ============================================================================
// Calculator
// ============================================================================

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute per-source completion percentage.
 * Returns null if the source has no available content (weight redistributed).
 */
function computeSourcePercent(
  source: SourceKey,
  data: EngagementSourceData,
): number | null {
  switch (source) {
    case 'videos':
      if (data.videosTotal === 0) return null;
      return clamp((data.videosCompleted / data.videosTotal) * 100);

    case 'text':
      if (data.textTotal === 0) return null;
      return clamp((data.textViewed / data.textTotal) * 100);

    case 'flashcards': {
      if (data.flashcardsTotal === 0) return null;
      // Require a minimum batch to count as "reviewed"
      const reviewed = data.flashcardsReviewed >= MEANINGFUL_THRESHOLDS.flashcardMinBatch
        ? data.flashcardsReviewed
        : 0;
      return clamp((reviewed / data.flashcardsTotal) * 100);
    }

    case 'visuals':
      if (data.visualsTotal === 0) return null;
      return clamp((data.visualsViewed / data.visualsTotal) * 100);

    case 'practice': {
      if (data.practiceTotal === 0) return null;
      // Require minimum questions attempted to count
      const completed = data.practiceCompleted >= MEANINGFUL_THRESHOLDS.practiceMinQuestions
        ? data.practiceCompleted
        : 0;
      return clamp((completed / data.practiceTotal) * 100);
    }

    default:
      return null;
  }
}

/**
 * Calculate multi-source engagement score with weight redistribution.
 * 
 * Sources with no available content have their weight redistributed
 * proportionally to sources that do have content.
 */
export function calculateEngagement(data: EngagementSourceData): EngagementResult {
  // 1. Compute raw percent for each source
  const rawPercents: Record<SourceKey, number | null> = {} as any;
  const activeSources: SourceKey[] = [];

  for (const key of SOURCE_KEYS) {
    const pct = computeSourcePercent(key, data);
    rawPercents[key] = pct;
    if (pct !== null) {
      activeSources.push(key);
    }
  }

  // 2. Redistribute weights among active sources
  let activeWeightSum = 0;
  for (const key of activeSources) {
    activeWeightSum += ENGAGEMENT_SOURCE_WEIGHTS[key];
  }

  // 3. Compute weighted engagement
  let engagementPercent = 0;
  const sourceBreakdown: EngagementSourceBreakdown[] = [];

  for (const key of SOURCE_KEYS) {
    const rawPct = rawPercents[key];
    const hasContent = rawPct !== null;
    const effectiveWeight = hasContent && activeWeightSum > 0
      ? ENGAGEMENT_SOURCE_WEIGHTS[key] / activeWeightSum
      : 0;
    const contribution = hasContent ? (rawPct! * effectiveWeight) : 0;
    engagementPercent += contribution;

    sourceBreakdown.push({
      source: key,
      weight: ENGAGEMENT_SOURCE_WEIGHTS[key],
      effectiveWeight,
      rawPercent: rawPct ?? 0,
      contribution: Math.round(contribution * 100) / 100,
      hasContent,
    });
  }

  // 4. Identify missing tracking
  const missingTracking: string[] = [];
  // Text dwell time not tracked — we use content_views as a binary proxy
  if (rawPercents.text !== null) {
    missingTracking.push('text_dwell_time: using view-count proxy, not actual read time');
  }
  // Video threshold applied at data level (caller counts only videos >= threshold)
  // No scroll-depth tracking for text

  return {
    engagementPercent: Math.round(clamp(engagementPercent)),
    sourceBreakdown,
    missingTracking,
    sourcesWithContent: activeSources.length,
    totalSources: SOURCE_KEYS.length,
  };
}

// ============================================================================
// Helper: Build EngagementSourceData from RPC Progress Data
// ============================================================================

/**
 * Map the data returned by useChapterProgress / get_content_progress RPC
 * into EngagementSourceData for the engagement calculator.
 * 
 * Video completion threshold is applied here: only videos watched past
 * MEANINGFUL_THRESHOLDS.videoWatchPercent count as "completed".
 */
export interface RpcProgressForEngagement {
  // Videos (already threshold-filtered by caller via percent_watched >= 70)
  videosCompleted: number;
  videosTotal: number;
  // Practice
  mcqCompleted: number;
  mcqTotal: number;
  essayCompleted: number;
  essayTotal: number;
  osceCompleted: number;
  osceTotal: number;
  caseCompleted: number;
  caseTotal: number;
  matchingCompleted: number;
  matchingTotal: number;
  tfCompleted: number;
  tfTotal: number;
  // Flashcards
  flashcardReviewed: number;
  flashcardTotal: number;
  // Visuals
  mindMapViewed: number;
  mindMapTotal: number;
  guidedViewed: number;
  guidedTotal: number;
  referenceViewed: number;
  referenceTotal: number;
  clinicalToolViewed: number;
  clinicalToolTotal: number;
  pathwayViewed: number;
  pathwayTotal: number;
  // Text — not currently separated from visuals in the RPC;
  // will use 0/0 until text resources are tracked independently.
  textViewed?: number;
  textTotal?: number;
}

export function mapRpcToEngagementData(rpc: RpcProgressForEngagement): EngagementSourceData {
  return {
    videosCompleted: rpc.videosCompleted,
    videosTotal: rpc.videosTotal,

    textViewed: rpc.textViewed ?? 0,
    textTotal: rpc.textTotal ?? 0,

    flashcardsReviewed: rpc.flashcardReviewed,
    flashcardsTotal: rpc.flashcardTotal,

    visualsViewed:
      rpc.mindMapViewed +
      rpc.guidedViewed +
      rpc.referenceViewed +
      rpc.clinicalToolViewed +
      rpc.pathwayViewed,
    visualsTotal:
      rpc.mindMapTotal +
      rpc.guidedTotal +
      rpc.referenceTotal +
      rpc.clinicalToolTotal +
      rpc.pathwayTotal,

    practiceCompleted:
      rpc.mcqCompleted +
      rpc.essayCompleted +
      rpc.osceCompleted +
      rpc.caseCompleted +
      rpc.matchingCompleted +
      rpc.tfCompleted,
    practiceTotal:
      rpc.mcqTotal +
      rpc.essayTotal +
      rpc.osceTotal +
      rpc.caseTotal +
      rpc.matchingTotal +
      rpc.tfTotal,
  };
}
