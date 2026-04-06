import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import type {
  ChapterReadinessResult,
  ChapterStatus,
  ComponentScores,
  EvidenceLevel,
  ReviewUrgency,
  RiskFlag,
} from '@/lib/readiness/types';

// ── Cached row shape (matches DB columns) ───────────────────────────────

interface CachedReadinessRow {
  id: string;
  user_id: string;
  module_id: string;
  chapter_id: string | null;
  readiness_score: number;
  chapter_status: string;
  component_scores: ComponentScores;
  evidence_level: string;
  risk_flags: RiskFlag[];
  review_urgency: string;
  review_reason: string;
  next_best_action: string;
  insight_message: string;
  calculation_version: string;
  is_stale: boolean;
  last_calculated_at: string;
  // Legacy columns (kept for backward compat)
  coverage_score: number;
  performance_score: number;
  improvement_score: number;
  consistency_score: number;
  exam_readiness: number;
  cap_type: string | null;
  raw_score: number;
}

// ── Public result type ──────────────────────────────────────────────────

export interface CachedChapterReadiness {
  readinessScore: number;
  chapterStatus: ChapterStatus;
  componentScores: ComponentScores;
  evidenceLevel: EvidenceLevel;
  riskFlags: RiskFlag[];
  reviewUrgency: ReviewUrgency;
  reviewReason: string;
  nextBestAction: string;
  insightMessage: string;
  calculationVersion: string;
  isStale: boolean;
  lastCalculatedAt: string;
}

function rowToResult(row: CachedReadinessRow): CachedChapterReadiness {
  return {
    readinessScore: row.readiness_score,
    chapterStatus: row.chapter_status as ChapterStatus,
    componentScores: row.component_scores,
    evidenceLevel: row.evidence_level as EvidenceLevel,
    riskFlags: row.risk_flags ?? [],
    reviewUrgency: row.review_urgency as ReviewUrgency,
    reviewReason: row.review_reason,
    nextBestAction: row.next_best_action,
    insightMessage: row.insight_message,
    calculationVersion: row.calculation_version,
    isStale: row.is_stale,
    lastCalculatedAt: row.last_calculated_at,
  };
}

function getEmptyCachedResult(): CachedChapterReadiness {
  return {
    readinessScore: 0,
    chapterStatus: 'not_started',
    componentScores: { engagement: 0, performance: 0, retention: 0, consistency: 0, confidence: 0 },
    evidenceLevel: 'none',
    riskFlags: [],
    reviewUrgency: 'low_priority',
    reviewReason: '',
    nextBestAction: 'Start learning',
    insightMessage: '',
    calculationVersion: '2.0.0',
    isStale: true,
    lastCalculatedAt: '',
  };
}

// ── Hook: fetch cached readiness for a single chapter ───────────────────

export function useCachedReadiness(chapterId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['cached-readiness', chapterId, user?.id],
    queryFn: async (): Promise<CachedChapterReadiness> => {
      if (!user?.id || !chapterId) return getEmptyCachedResult();

      const { data, error } = await supabase
        .from('student_readiness_cache' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      if (error || !data) return getEmptyCachedResult();

      return rowToResult(data as unknown as CachedReadinessRow);
    },
    enabled: !!user?.id && !!chapterId,
    staleTime: 60_000,
  });
}

// ── Hook: fetch cached readiness for all chapters in a module ───────────

export function useModuleCachedReadiness(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['cached-readiness-module', moduleId, user?.id],
    queryFn: async (): Promise<CachedChapterReadiness[]> => {
      if (!user?.id || !moduleId) return [];

      const { data, error } = await supabase
        .from('student_readiness_cache' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', moduleId);

      if (error || !data) return [];

      return (data as unknown as CachedReadinessRow[]).map(rowToResult);
    },
    enabled: !!user?.id && !!moduleId,
    staleTime: 60_000,
  });
}

// ── Hook: refresh readiness cache via edge function ─────────────────────

export function useRefreshReadinessCache() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      moduleId,
      chapterId,
      forceRecalculate = false,
    }: {
      moduleId: string;
      chapterId?: string;
      forceRecalculate?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('cache-readiness', {
        body: { userId: user.id, moduleId, chapterId, forceRecalculate },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['cached-readiness'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cached-readiness-module', variables.moduleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['student-dashboard'],
      });
    },
  });
}

// ── Backward compat: convert cached data to ChapterReadinessResult ──────

export function cachedToReadinessResult(
  cached: CachedChapterReadiness,
  chapterId: string,
  moduleId: string,
): ChapterReadinessResult {
  return {
    readinessScore: cached.readinessScore,
    chapterStatus: cached.chapterStatus,
    componentScores: cached.componentScores,
    effectiveWeights: { engagement: 0, performance: 0, retention: 0, consistency: 0, confidence: 0 },
    missingComponents: [],
    evidenceLevel: cached.evidenceLevel,
    riskFlags: cached.riskFlags,
    reviewUrgency: cached.reviewUrgency,
    reviewReason: cached.reviewReason,
    nextBestAction: cached.nextBestAction,
    insightMessage: cached.insightMessage,
    secondaryHint: null,
    calculationVersion: cached.calculationVersion,
    chapterId,
    moduleId,
  };
}
