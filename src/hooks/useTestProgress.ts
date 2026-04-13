import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { MIN_ATTEMPTS_FOR_IMPROVEMENT } from '@/lib/readinessCalculator';
import { useMergedModuleConfig, expandModuleIds } from '@/hooks/useMergedModuleConfig';

export interface TestProgressData {
  mcq: {
    accuracy: number;
    attempts: number;
    weeklyChange: number; // Kept for backward compatibility (derived from attempt-based data)
    // Attempt-based improvement data
    recentAttempts: { correct: number; total: number }[];
    priorAttempts: { correct: number; total: number }[];
  };
  osce: {
    avgScore: number;
    attempts: number;
    weeklyChange: number; // Kept for backward compatibility (derived from attempt-based data)
    // Attempt-based improvement data
    recentScores: number[];
    priorScores: number[];
  };
  conceptCheck: {
    passRate: number;
    passed: number;
    total: number;
  };
  hasAnyAttempts: boolean;
}

// Number of recent attempts to use for improvement calculation
const RECENT_MCQ_ATTEMPTS = 10;
const RECENT_OSCE_ATTEMPTS = 5;

/**
 * Hook to fetch test/assessment progress for the dashboard
 * Enhanced with attempt-based improvement data for the unified readiness system.
 */
export function useTestProgress(moduleId?: string) {
  const { user } = useAuthContext();
  const { data: mergedConfig } = useMergedModuleConfig();
  const expandedIds = moduleId ? expandModuleIds([moduleId], mergedConfig ?? null) : [];

  return useQuery({
    queryKey: ['test-progress', moduleId, user?.id, mergedConfig?.chapterMerge],
    queryFn: async (): Promise<TestProgressData> => {
      if (!user?.id) {
        return getEmptyProgress();
      }

      // Fetch all question attempts for this user
      let query = supabase
        .from('question_attempts')
        .select('question_type, is_correct, selected_answer, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100); // Only need ~20 for improvement calc, 100 gives accurate aggregates

      // If moduleId provided, we need to filter by chapters in that module (expanded)
      let chapterIds: string[] = [];
      if (moduleId && expandedIds.length > 0) {
        const { data: chapters } = await supabase
          .from('module_chapters')
          .select('id')
          .in('module_id', expandedIds);
        chapterIds = chapters?.map(c => c.id) || [];
      }

      // Apply chapter filter when we have chapter IDs
      if (chapterIds.length > 0) {
        query = query.in('chapter_id', chapterIds);
      }

      const { data: attempts, error } = await query;

      if (error) {
        console.error('Error fetching test progress:', error);
        return getEmptyProgress();
      }

      if (!attempts || attempts.length === 0) {
        return getEmptyProgress();
      }

      // Filter and calculate MCQ stats
      const mcqAttempts = attempts.filter(a => a.question_type === 'mcq');
      const mcqCorrect = mcqAttempts.filter(a => a.is_correct).length;
      const mcqAccuracy = mcqAttempts.length > 0 ? (mcqCorrect / mcqAttempts.length) * 100 : 0;

      // Calculate MCQ attempt-based improvement data
      // Group attempts into "recent" and "prior" batches
      const recentMcqAttempts = mcqAttempts.slice(0, RECENT_MCQ_ATTEMPTS);
      const priorMcqAttempts = mcqAttempts.slice(RECENT_MCQ_ATTEMPTS, RECENT_MCQ_ATTEMPTS * 2);

      // Convert to the format expected by readinessCalculator
      const mcqRecentData = recentMcqAttempts.map(a => ({
        correct: a.is_correct ? 1 : 0,
        total: 1,
      }));
      const mcqPriorData = priorMcqAttempts.map(a => ({
        correct: a.is_correct ? 1 : 0,
        total: 1,
      }));

      // Calculate MCQ weeklyChange from attempt-based data for backward compatibility
      let mcqWeeklyChange = 0;
      if (recentMcqAttempts.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.mcq && 
          priorMcqAttempts.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.mcq) {
        const recentCorrect = recentMcqAttempts.filter(a => a.is_correct).length;
        const priorCorrect = priorMcqAttempts.filter(a => a.is_correct).length;
        const recentAccuracy = (recentCorrect / recentMcqAttempts.length) * 100;
        const priorAccuracy = (priorCorrect / priorMcqAttempts.length) * 100;
        mcqWeeklyChange = Math.round(recentAccuracy - priorAccuracy);
      }

      // Filter and calculate OSCE stats
      const osceAttempts = attempts.filter(a => a.question_type === 'osce');
      const osceScores = osceAttempts
        .map(a => {
          const answer = a.selected_answer as { score?: number } | null;
          return answer?.score ?? 0;
        })
        .filter(s => s > 0);
      const osceAvgScore = osceScores.length > 0
        ? osceScores.reduce((sum, s) => sum + s, 0) / osceScores.length
        : 0;

      // Calculate OSCE attempt-based improvement data
      const recentOsceAttempts = osceAttempts.slice(0, RECENT_OSCE_ATTEMPTS);
      const priorOsceAttempts = osceAttempts.slice(RECENT_OSCE_ATTEMPTS, RECENT_OSCE_ATTEMPTS * 2);

      const osceRecentScores = recentOsceAttempts
        .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
        .filter(s => s > 0);
      const oscePriorScores = priorOsceAttempts
        .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
        .filter(s => s > 0);

      // Calculate OSCE weeklyChange from attempt-based data for backward compatibility
      let osceWeeklyChange = 0;
      if (osceRecentScores.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.osce && 
          oscePriorScores.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.osce) {
        const recentAvg = osceRecentScores.reduce((sum, s) => sum + s, 0) / osceRecentScores.length;
        const priorAvg = oscePriorScores.reduce((sum, s) => sum + s, 0) / oscePriorScores.length;
        osceWeeklyChange = Number((recentAvg - priorAvg).toFixed(1));
      }

      // Filter and calculate Concept Check stats
      const conceptCheckAttempts = attempts.filter(a => a.question_type === 'guided_explanation');
      const conceptCheckPassed = conceptCheckAttempts.filter(a => a.is_correct).length;
      const conceptCheckTotal = conceptCheckAttempts.length;
      const conceptCheckPassRate = conceptCheckTotal > 0
        ? (conceptCheckPassed / conceptCheckTotal) * 100
        : 0;

      return {
        mcq: {
          accuracy: Math.round(mcqAccuracy),
          attempts: mcqAttempts.length,
          weeklyChange: mcqWeeklyChange,
          recentAttempts: mcqRecentData,
          priorAttempts: mcqPriorData,
        },
        osce: {
          avgScore: Number(osceAvgScore.toFixed(1)),
          attempts: osceAttempts.length,
          weeklyChange: osceWeeklyChange,
          recentScores: osceRecentScores,
          priorScores: oscePriorScores,
        },
        conceptCheck: {
          passRate: Math.round(conceptCheckPassRate),
          passed: conceptCheckPassed,
          total: conceptCheckTotal,
        },
        hasAnyAttempts: mcqAttempts.length > 0 || osceAttempts.length > 0 || conceptCheckTotal > 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });
}

function getEmptyProgress(): TestProgressData {
  return {
    mcq: { 
      accuracy: 0, 
      attempts: 0, 
      weeklyChange: 0,
      recentAttempts: [], 
      priorAttempts: [] 
    },
    osce: { 
      avgScore: 0, 
      attempts: 0, 
      weeklyChange: 0,
      recentScores: [], 
      priorScores: [] 
    },
    conceptCheck: { passRate: 0, passed: 0, total: 0 },
    hasAnyAttempts: false,
  };
}
