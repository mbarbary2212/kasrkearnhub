/**
 * Edge Function: cache-readiness (v2)
 *
 * Computes chapter-level readiness using the Unified Readiness Engine logic
 * and upserts results into `student_readiness_cache`.
 *
 * Accepts:
 *   { userId, moduleId, chapterId?, forceRecalculate? }
 *
 * If chapterId is omitted, recalculates all chapters in the module.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Config (mirrors src/lib/readiness/config.ts) ────────────────────────

const CALCULATION_VERSION = '2.0.0';

const COMPONENT_WEIGHTS = {
  engagement: 0.25,
  performance: 0.35,
  retention: 0.20,
  consistency: 0.10,
  confidence: 0.10,
};

const EVIDENCE_CAPS: Record<string, number> = {
  none: 0,
  low: 40,
  moderate: 75,
  strong: 100,
};

const EVIDENCE_THRESHOLDS = { low: 1, moderate: 3, strong: 5 };

const STATUS_THRESHOLDS = { started: 0, building: 25, ready: 65, strong: 85 };

const COMPETENCY_GUARDRAILS = {
  readyMinAccuracy: 65,
  strongMinAccuracy: 75,
  readyMinEngagement: 30,
  strongMinEngagement: 50,
  zeroStateEngagement: 5,
  needsAttentionAccuracy: 50,
  minAttemptsForFlag: 5,
};

const RISK_FLAG_THRESHOLDS = {
  lowEngagement: 20,
  weakPerformanceAccuracy: 50,
  weakPerformanceMinAttempts: 5,
  overdueRevisionDays: 14,
  inconsistentConsistency: 30,
  overconfidentErrorRate: 25,
};

const REVIEW_URGENCY_THRESHOLDS = {
  reviewNowInactiveDays: 14,
  reviewSoonInactiveDays: 7,
};

// ── Types ───────────────────────────────────────────────────────────────

type ComponentName = 'engagement' | 'performance' | 'retention' | 'consistency' | 'confidence';
type EvidenceLevel = 'none' | 'low' | 'moderate' | 'strong';
type ChapterStatus = 'not_started' | 'started' | 'building' | 'needs_attention' | 'ready' | 'strong';
type ReviewUrgency = 'review_now' | 'review_soon' | 'on_track' | 'low_priority';
type RiskSeverity = 'low' | 'medium' | 'high';

interface RiskFlag {
  flag: string;
  severity: RiskSeverity;
  description: string;
}

interface ComponentScores {
  engagement: number;
  performance: number;
  retention: number;
  consistency: number;
  confidence: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

const COMPONENT_KEYS: ComponentName[] = ['engagement', 'performance', 'retention', 'consistency', 'confidence'];

function determineEvidenceLevel(activeCount: number): EvidenceLevel {
  if (activeCount >= EVIDENCE_THRESHOLDS.strong) return 'strong';
  if (activeCount >= EVIDENCE_THRESHOLDS.moderate) return 'moderate';
  if (activeCount >= EVIDENCE_THRESHOLDS.low) return 'low';
  return 'none';
}

function redistributeWeights(active: Set<ComponentName>): Record<ComponentName, number> {
  const weights: Record<ComponentName, number> = { engagement: 0, performance: 0, retention: 0, consistency: 0, confidence: 0 };
  if (active.size === 0) return weights;
  let sum = 0;
  for (const k of COMPONENT_KEYS) if (active.has(k)) sum += COMPONENT_WEIGHTS[k];
  for (const k of COMPONENT_KEYS) if (active.has(k)) weights[k] = COMPONENT_WEIGHTS[k] / sum;
  return weights;
}

function classifyChapterStatus(
  score: number, evidence: EvidenceLevel, engagement: number,
  accuracy: number | null, attempts: number,
): ChapterStatus {
  const g = COMPETENCY_GUARDRAILS;
  if (evidence === 'none') return 'not_started';
  if (engagement < g.zeroStateEngagement && attempts === 0) return 'not_started';
  if (accuracy != null && accuracy < g.needsAttentionAccuracy && attempts >= g.minAttemptsForFlag) return 'needs_attention';
  if (score >= STATUS_THRESHOLDS.strong && evidence === 'strong' &&
      (accuracy == null || accuracy >= g.strongMinAccuracy) && engagement >= g.strongMinEngagement) return 'strong';
  if (score >= STATUS_THRESHOLDS.ready && (evidence === 'moderate' || evidence === 'strong') &&
      (accuracy == null || accuracy >= g.readyMinAccuracy) && engagement >= g.readyMinEngagement) return 'ready';
  if (score >= STATUS_THRESHOLDS.building) return 'building';
  return 'started';
}

function detectRiskFlags(
  scores: ComponentScores, recentAccuracy: number | null, totalAttempts: number,
  hasOverdueFlashcards: boolean, daysSinceLastActivity: number | null,
  overconfidentErrorRate: number | null, evidenceLevel: EvidenceLevel,
): RiskFlag[] {
  const t = RISK_FLAG_THRESHOLDS;
  const flags: RiskFlag[] = [];
  if (recentAccuracy != null && recentAccuracy < t.weakPerformanceAccuracy && totalAttempts >= t.weakPerformanceMinAttempts) {
    flags.push({ flag: 'weak_performance', severity: recentAccuracy < 30 ? 'high' : 'medium', description: `Recent accuracy is ${Math.round(recentAccuracy)}%.` });
  }
  if (hasOverdueFlashcards) {
    const sev: RiskSeverity = daysSinceLastActivity != null && daysSinceLastActivity >= t.overdueRevisionDays ? 'high' : 'medium';
    flags.push({ flag: 'overdue_revision', severity: sev, description: 'Flashcards are overdue for review.' });
  }
  if (scores.engagement < t.lowEngagement) {
    flags.push({ flag: 'low_engagement', severity: scores.engagement === 0 ? 'high' : 'medium', description: `Content engagement is only ${Math.round(scores.engagement)}%.` });
  }
  if (scores.consistency < t.inconsistentConsistency && scores.consistency > 0) {
    flags.push({ flag: 'inconsistent_activity', severity: 'medium', description: 'Study activity has been irregular recently.' });
  }
  if (overconfidentErrorRate != null && overconfidentErrorRate >= t.overconfidentErrorRate) {
    flags.push({ flag: 'overconfident_errors', severity: overconfidentErrorRate >= 50 ? 'high' : 'medium', description: `Overconfident error rate is ${Math.round(overconfidentErrorRate)}%.` });
  }
  if (evidenceLevel === 'none' || evidenceLevel === 'low') {
    flags.push({ flag: 'low_evidence', severity: 'low', description: 'Not enough activity data to assess this chapter reliably.' });
  }
  return flags;
}

function determineReviewUrgency(
  status: ChapterStatus, riskFlags: RiskFlag[], daysSinceLastActivity: number | null,
  _evidenceLevel: EvidenceLevel, _scores: ComponentScores,
): { urgency: ReviewUrgency; reason: string; suggestedAction: string } {
  const days = daysSinceLastActivity ?? 0;
  const started = status !== 'not_started';
  if (!started) return { urgency: 'low_priority', reason: 'Chapter not yet started.', suggestedAction: 'Start this chapter when ready.' };

  const hasHigh = riskFlags.some(f => f.severity === 'high');
  const weakPerf = riskFlags.find(f => f.flag === 'weak_performance');
  const hasMedHigh = riskFlags.some(f => f.severity === 'high' || f.severity === 'medium');

  if (status === 'needs_attention' && hasHigh) return { urgency: 'review_now', reason: 'Performance issues require immediate attention.', suggestedAction: 'Review weak areas and retry practice questions.' };
  if (days >= REVIEW_URGENCY_THRESHOLDS.reviewNowInactiveDays) return { urgency: 'review_now', reason: `No activity for ${days} days — knowledge may have decayed.`, suggestedAction: 'Do a quick review session to refresh your memory.' };
  if (weakPerf && weakPerf.severity === 'high') return { urgency: 'review_now', reason: 'Recent accuracy is critically low.', suggestedAction: 'Focus on understanding core concepts before more practice.' };

  if (riskFlags.find(f => f.flag === 'overdue_revision')) return { urgency: 'review_soon', reason: 'Flashcards are overdue for revision.', suggestedAction: 'Complete your pending flashcard reviews.' };
  if (days >= REVIEW_URGENCY_THRESHOLDS.reviewSoonInactiveDays) return { urgency: 'review_soon', reason: `${days} days since last activity — consider a refresher.`, suggestedAction: 'Spend a few minutes reviewing key material.' };
  if (weakPerf && weakPerf.severity === 'medium') return { urgency: 'review_soon', reason: 'Recent accuracy is below expectations.', suggestedAction: 'Review mistakes from recent practice sessions.' };
  if (status === 'needs_attention') return { urgency: 'review_soon', reason: 'This chapter needs more work to reach readiness.', suggestedAction: 'Revisit challenging topics and practice again.' };

  if ((status === 'strong' || status === 'ready') && !hasMedHigh) {
    return { urgency: 'low_priority', reason: status === 'strong' ? 'Excellent mastery.' : 'Good progress.', suggestedAction: 'Continue current study pace.' };
  }

  return { urgency: 'on_track', reason: 'Progressing steadily — no urgent action needed.', suggestedAction: 'Continue your current study plan.' };
}

function generateNarratives(
  status: ChapterStatus, scores: ComponentScores, primaryFlag: string | null,
  recentAccuracy: number | null,
): { nextBestAction: string; insightMessage: string } {
  // Simplified narrative generation for cache
  if (status === 'not_started') return { insightMessage: "You haven't started this chapter yet.", nextBestAction: 'Start learning' };

  if (primaryFlag === 'weak_performance') return {
    insightMessage: scores.engagement >= 50 ? 'You are active but accuracy still needs work.' : 'This chapter needs attention — recent performance is weak.',
    nextBestAction: 'Revisit weak questions',
  };
  if (primaryFlag === 'overdue_revision') return { insightMessage: 'Your revision is falling behind.', nextBestAction: 'Review overdue flashcards' };
  if (primaryFlag === 'low_engagement') return {
    insightMessage: recentAccuracy != null && recentAccuracy >= 65 ? 'Performing well but not enough content covered yet.' : 'Low content coverage — focus on the core material.',
    nextBestAction: 'Finish core content',
  };
  if (primaryFlag === 'inconsistent_activity') return { insightMessage: 'Your study pattern has been inconsistent.', nextBestAction: 'Do a short study session' };
  if (primaryFlag === 'overconfident_errors') return { insightMessage: 'Making errors on questions rated as confident.', nextBestAction: 'Redo confident-but-wrong questions' };
  if (primaryFlag === 'low_evidence') return { insightMessage: 'Not enough data to assess this chapter reliably.', nextBestAction: 'Complete more activities' };

  switch (status) {
    case 'strong': return { insightMessage: 'Great progress — maintain with light review.', nextBestAction: 'Continue — progress is stable' };
    case 'ready': return { insightMessage: 'Well prepared — try exam conditions.', nextBestAction: 'Try an exam-style practice set' };
    case 'building': return { insightMessage: 'Making steady progress.', nextBestAction: scores.performance < 60 ? 'Do 10 more MCQs' : 'Keep practising' };
    case 'needs_attention': return { insightMessage: 'This chapter needs focused effort.', nextBestAction: 'Focus on weak areas' };
    default: return { insightMessage: 'You have begun this chapter.', nextBestAction: 'Continue learning' };
  }
}

// ── Compute readiness for a single chapter ──────────────────────────────

interface ChapterMetrics {
  chapter_id: string;
  module_id: string;
  coverage_percent: number;
  recent_mcq_accuracy: number;
  mcq_attempts: number;
  flashcards_overdue: number;
  flashcards_due: number;
  last_activity_at: string | null;
  overconfident_error_rate: number | null;
  confidence_avg: number | null;
}

function computeChapterReadiness(m: ChapterMetrics) {
  // Derive component scores
  const engagementPercent = clamp(m.coverage_percent);

  const recentAccuracy = m.mcq_attempts > 0 ? m.recent_mcq_accuracy : null;
  const totalAttempts = m.mcq_attempts;

  // Retention
  let retentionScore: number | null = null;
  const overdue = m.flashcards_overdue ?? 0;
  if (overdue > 0) retentionScore = overdue > 15 ? 10 : overdue > 5 ? 30 : 60;
  else if ((m.flashcards_due ?? 0) >= 0 && m.flashcards_overdue != null) retentionScore = 100;

  // Consistency
  let consistencyScore: number | null = null;
  let daysSinceLastActivity: number | null = null;
  if (m.last_activity_at) {
    daysSinceLastActivity = Math.max(0, Math.floor((Date.now() - new Date(m.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)));
    if (daysSinceLastActivity < 3) consistencyScore = 100;
    else if (daysSinceLastActivity < 7) consistencyScore = 70;
    else if (daysSinceLastActivity < 14) consistencyScore = 40;
    else consistencyScore = 15;
  }

  // Confidence
  const confidenceScore = m.confidence_avg != null ? Math.round(Number(m.confidence_avg) * 100) / 100 : null;

  const hasOverdueFlashcards = overdue > 0;
  const overconfidentErrorRate = m.overconfident_error_rate != null ? Number(m.overconfident_error_rate) : null;

  // Build raw scores
  const rawScores: Record<ComponentName, number | null> = {
    engagement: engagementPercent > 0 || totalAttempts > 0 ? clamp(engagementPercent) : null,
    performance: recentAccuracy != null && totalAttempts > 0 ? clamp(recentAccuracy) : null,
    retention: retentionScore,
    consistency: consistencyScore,
    confidence: confidenceScore,
  };

  // Determine active
  const activeComponents = new Set<ComponentName>();
  const finalScores: ComponentScores = { engagement: 0, performance: 0, retention: 0, consistency: 0, confidence: 0 };
  const missingComponents: ComponentName[] = [];

  for (const key of COMPONENT_KEYS) {
    const val = rawScores[key];
    if (val != null) {
      activeComponents.add(key);
      finalScores[key] = val;
    } else {
      missingComponents.push(key);
    }
  }

  const evidenceLevel = determineEvidenceLevel(activeComponents.size);
  const effectiveWeights = redistributeWeights(activeComponents);

  let rawScore = 0;
  for (const key of COMPONENT_KEYS) rawScore += finalScores[key] * effectiveWeights[key];
  rawScore = Math.round(clamp(rawScore));

  const evidenceCap = EVIDENCE_CAPS[evidenceLevel];
  const cappedScore = Math.min(rawScore, evidenceCap);

  const g = COMPETENCY_GUARDRAILS;
  const readinessScore = finalScores.engagement < g.zeroStateEngagement && totalAttempts === 0 ? 0 : cappedScore;

  const chapterStatus = classifyChapterStatus(readinessScore, evidenceLevel, finalScores.engagement, recentAccuracy, totalAttempts);
  const riskFlags = detectRiskFlags(finalScores, recentAccuracy, totalAttempts, hasOverdueFlashcards, daysSinceLastActivity, overconfidentErrorRate, evidenceLevel);
  const urgencyResult = determineReviewUrgency(chapterStatus, riskFlags, daysSinceLastActivity, evidenceLevel, finalScores);
  const primaryFlag = riskFlags.length > 0 ? riskFlags[0].flag : null;
  const narratives = generateNarratives(chapterStatus, finalScores, primaryFlag, recentAccuracy);

  return {
    readiness_score: readinessScore,
    chapter_status: chapterStatus,
    component_scores: finalScores,
    evidence_level: evidenceLevel,
    risk_flags: riskFlags,
    review_urgency: urgencyResult.urgency,
    review_reason: urgencyResult.reason,
    next_best_action: narratives.nextBestAction,
    insight_message: narratives.insightMessage,
    calculation_version: CALCULATION_VERSION,
    is_stale: false,
  };
}

// ── Main handler ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, moduleId, chapterId, forceRecalculate } = await req.json();

    if (!userId || !moduleId) {
      return new Response(
        JSON.stringify({ error: 'userId and moduleId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[cache-readiness] v2 calc user=${userId} module=${moduleId} chapter=${chapterId || 'all'}`);

    // Determine which chapters to process
    let chapterIds: string[] = [];
    if (chapterId) {
      chapterIds = [chapterId];
    } else {
      const { data: chapters } = await supabase
        .from('module_chapters')
        .select('id')
        .eq('module_id', moduleId);
      chapterIds = (chapters || []).map((c: { id: string }) => c.id);
    }

    if (chapterIds.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // If not forcing, check staleness
    if (!forceRecalculate && chapterId) {
      const { data: existing } = await supabase
        .from('student_readiness_cache')
        .select('is_stale, last_calculated_at')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      if (existing && !existing.is_stale) {
        const age = Date.now() - new Date(existing.last_calculated_at).getTime();
        if (age < 5 * 60 * 1000) {
          console.log(`[cache-readiness] fresh cache, skipping`);
          return new Response(
            JSON.stringify({ cached: true, updated: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    }

    // Fetch metrics for all target chapters
    const { data: metricsRows } = await supabase
      .from('student_chapter_metrics')
      .select('chapter_id, module_id, coverage_percent, recent_mcq_accuracy, mcq_attempts, flashcards_overdue, flashcards_due, last_activity_at, overconfident_error_rate, confidence_avg')
      .eq('student_id', userId)
      .in('chapter_id', chapterIds);

    const metricsMap = new Map<string, ChapterMetrics>();
    for (const row of (metricsRows || [])) {
      metricsMap.set(row.chapter_id, row as unknown as ChapterMetrics);
    }

    // Process each chapter
    const upsertRows = [];
    for (const cId of chapterIds) {
      const metrics = metricsMap.get(cId) || {
        chapter_id: cId,
        module_id: moduleId,
        coverage_percent: 0,
        recent_mcq_accuracy: 0,
        mcq_attempts: 0,
        flashcards_overdue: 0,
        flashcards_due: 0,
        last_activity_at: null,
        overconfident_error_rate: null,
        confidence_avg: null,
      };

      const result = computeChapterReadiness(metrics);

      upsertRows.push({
        user_id: userId,
        module_id: moduleId,
        chapter_id: cId,
        ...result,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Legacy columns — keep at 0 for backward compat
        coverage_score: Math.round(result.component_scores.engagement),
        performance_score: Math.round(result.component_scores.performance),
        improvement_score: 50,
        consistency_score: Math.round(result.component_scores.consistency),
        exam_readiness: result.readiness_score,
        cap_type: null,
        raw_score: result.readiness_score,
      });
    }

    const { error: upsertError } = await supabase
      .from('student_readiness_cache')
      .upsert(upsertRows, { onConflict: 'user_id,chapter_id' });

    if (upsertError) {
      console.error('[cache-readiness] upsert error:', upsertError);
      throw upsertError;
    }

    console.log(`[cache-readiness] updated ${upsertRows.length} chapters`);

    return new Response(
      JSON.stringify({ cached: false, updated: upsertRows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[cache-readiness] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
