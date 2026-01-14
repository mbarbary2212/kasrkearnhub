import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { startOfWeek, subWeeks } from 'date-fns';

export interface TestProgressData {
  mcq: {
    accuracy: number;
    attempts: number;
    weeklyChange: number;
  };
  osce: {
    avgScore: number;
    attempts: number;
    weeklyChange: number;
  };
  conceptCheck: {
    passRate: number;
    passed: number;
    total: number;
  };
  hasAnyAttempts: boolean;
}

/**
 * Hook to fetch test/assessment progress for the dashboard
 */
export function useTestProgress(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['test-progress', moduleId, user?.id],
    queryFn: async (): Promise<TestProgressData> => {
      if (!user?.id) {
        return getEmptyProgress();
      }

      // Fetch all question attempts for this user
      let query = supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', user.id);

      // If moduleId provided, we need to filter by chapters in that module
      let chapterIds: string[] = [];
      if (moduleId) {
        const { data: chapters } = await supabase
          .from('module_chapters')
          .select('id')
          .eq('module_id', moduleId);
        chapterIds = chapters?.map(c => c.id) || [];
      }

      const { data: attempts, error } = await query;

      if (error) {
        console.error('Error fetching test progress:', error);
        return getEmptyProgress();
      }

      if (!attempts || attempts.length === 0) {
        return getEmptyProgress();
      }

      // Calculate dates for weekly comparison
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subWeeks(thisWeekStart, 1);

      // Filter and calculate MCQ stats
      const mcqAttempts = attempts.filter(a => a.question_type === 'mcq');
      const mcqCorrect = mcqAttempts.filter(a => a.is_correct).length;
      const mcqAccuracy = mcqAttempts.length > 0 ? (mcqCorrect / mcqAttempts.length) * 100 : 0;

      // Calculate MCQ weekly change
      const mcqThisWeek = mcqAttempts.filter(a => new Date(a.created_at) >= thisWeekStart);
      const mcqLastWeek = mcqAttempts.filter(a => {
        const date = new Date(a.created_at);
        return date >= lastWeekStart && date < thisWeekStart;
      });
      const mcqThisWeekAccuracy = mcqThisWeek.length > 0
        ? (mcqThisWeek.filter(a => a.is_correct).length / mcqThisWeek.length) * 100
        : 0;
      const mcqLastWeekAccuracy = mcqLastWeek.length > 0
        ? (mcqLastWeek.filter(a => a.is_correct).length / mcqLastWeek.length) * 100
        : 0;
      const mcqWeeklyChange = mcqThisWeek.length > 0 && mcqLastWeek.length > 0
        ? mcqThisWeekAccuracy - mcqLastWeekAccuracy
        : 0;

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

      // Calculate OSCE weekly change
      const osceThisWeek = osceAttempts.filter(a => new Date(a.created_at) >= thisWeekStart);
      const osceLastWeek = osceAttempts.filter(a => {
        const date = new Date(a.created_at);
        return date >= lastWeekStart && date < thisWeekStart;
      });
      const getAvgOsceScore = (arr: typeof osceAttempts) => {
        const scores = arr
          .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
          .filter(s => s > 0);
        return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
      };
      const osceWeeklyChange = osceThisWeek.length > 0 && osceLastWeek.length > 0
        ? getAvgOsceScore(osceThisWeek) - getAvgOsceScore(osceLastWeek)
        : 0;

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
          weeklyChange: Math.round(mcqWeeklyChange),
        },
        osce: {
          avgScore: Number(osceAvgScore.toFixed(1)),
          attempts: osceAttempts.length,
          weeklyChange: Number(osceWeeklyChange.toFixed(1)),
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
    mcq: { accuracy: 0, attempts: 0, weeklyChange: 0 },
    osce: { avgScore: 0, attempts: 0, weeklyChange: 0 },
    conceptCheck: { passRate: 0, passed: 0, total: 0 },
    hasAnyAttempts: false,
  };
}
