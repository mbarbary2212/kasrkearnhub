import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Types matching the database schema
export type QuestionAttemptStatus = 'unseen' | 'attempted' | 'correct' | 'incorrect';
export type PracticeQuestionType = 'mcq' | 'osce';

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  question_type: PracticeQuestionType;
  chapter_id: string | null;
  module_id: string;
  attempt_number: number;
  status: QuestionAttemptStatus;
  selected_answer: Json; // JSONB - MCQ: string key, OSCE: { 1: boolean, ... }
  is_correct: boolean | null;
  score: number | null; // For OSCE: 0-5
  time_spent_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChapterAttempt {
  id: string;
  user_id: string;
  chapter_id: string;
  module_id: string;
  question_type: PracticeQuestionType;
  attempt_number: number;
  score: number;
  total_questions: number;
  correct_count: number;
  time_spent_seconds: number;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface SaveQuestionAttemptParams {
  questionId: string;
  questionType: PracticeQuestionType;
  chapterId: string;
  moduleId: string;
  selectedAnswer: Json;
  isCorrect: boolean;
  score?: number; // For OSCE
}

/**
 * Hook to get all question attempts for a chapter (current attempt)
 */
export function useChapterQuestionAttempts(
  chapterId?: string,
  questionType?: PracticeQuestionType
) {
  const { effectiveUserId } = useEffectiveUser();

  return useQuery({
    queryKey: ['question-attempts', chapterId, questionType, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId || !chapterId) return [];

      // First get current attempt number for this chapter
      const currentAttempt = await getCurrentAttemptNumber(effectiveUserId, chapterId, questionType!);

      let query = supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('chapter_id', chapterId)
        .eq('attempt_number', currentAttempt);

      if (questionType) {
        query = query.eq('question_type', questionType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as QuestionAttempt[];
    },
    enabled: !!chapterId && !!effectiveUserId,
    staleTime: 10000,
  });
}

/**
 * Hook to get all chapter attempts for comparison
 */
export function useChapterAttemptHistory(
  chapterId?: string,
  questionType?: PracticeQuestionType
) {
  const { effectiveUserId } = useEffectiveUser();

  return useQuery({
    queryKey: ['chapter-attempts', chapterId, questionType, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId || !chapterId) return [];

      let query = supabase
        .from('chapter_attempts')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('chapter_id', chapterId)
        .order('attempt_number', { ascending: true });

      if (questionType) {
        query = query.eq('question_type', questionType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as ChapterAttempt[];
    },
    enabled: !!chapterId && !!effectiveUserId,
    staleTime: 30000,
  });
}

/**
 * Get the current attempt number for a chapter
 */
async function getCurrentAttemptNumber(
  userId: string,
  chapterId: string,
  questionType: PracticeQuestionType
): Promise<number> {
  const { data } = await supabase
    .from('chapter_attempts')
    .select('attempt_number')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .eq('question_type', questionType)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If there's a completed attempt, next one is +1, otherwise use the current
  if (data?.attempt_number) {
    // Check if the latest is completed
    const { data: latestAttempt } = await supabase
      .from('chapter_attempts')
      .select('is_completed')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .eq('question_type', questionType)
      .eq('attempt_number', data.attempt_number)
      .maybeSingle();

    if (latestAttempt?.is_completed) {
      return data.attempt_number + 1;
    }
    return data.attempt_number;
  }

  return 1;
}

/**
 * Hook to save a question attempt (auto-save)
 */
export function useSaveQuestionAttempt() {
  const { user } = useAuthContext();
  const { isSupportMode } = useEffectiveUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveQuestionAttemptParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Block writes in support mode (impersonation)
      if (isSupportMode) {
        toast.info('View-only mode: Progress is not saved during impersonation');
        return { success: false, blocked: true };
      }

      const { questionId, questionType, chapterId, moduleId, selectedAnswer, isCorrect, score } = params;

      // Get current attempt number
      const attemptNumber = await getCurrentAttemptNumber(user.id, chapterId, questionType);

      // Determine status
      const status: QuestionAttemptStatus = isCorrect ? 'correct' : 'incorrect';

      // Check if we already have an attempt for this question in current attempt
      const { data: existing } = await supabase
        .from('question_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .eq('question_type', questionType)
        .eq('attempt_number', attemptNumber)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('question_attempts')
          .update({
            selected_answer: selectedAnswer as Json,
            status,
            is_correct: isCorrect,
            score: score ?? null,
          } as never)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new - using raw insert since types may not be synced yet
        const { error } = await supabase
          .from('question_attempts')
          .insert([{
            user_id: user.id,
            question_id: questionId,
            question_type: questionType,
            chapter_id: chapterId,
            module_id: moduleId,
            attempt_number: attemptNumber,
            selected_answer: selectedAnswer as Json,
            status,
            is_correct: isCorrect,
            score: score ?? null,
          }] as never);

        if (error) throw error;
      }

      // Update or create chapter attempt record
      await updateChapterAttempt(user.id, chapterId, moduleId, questionType, attemptNumber, isCorrect, score);

      return { success: true, blocked: false };
    },
    onSuccess: (result, params) => {
      if (result.blocked) return;
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ 
        queryKey: ['question-attempts', params.chapterId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['chapter-attempts', params.chapterId] 
      });
    },
  });
}

/**
 * Update the chapter attempt aggregation
 */
async function updateChapterAttempt(
  userId: string,
  chapterId: string,
  moduleId: string,
  questionType: PracticeQuestionType,
  attemptNumber: number,
  isCorrect: boolean,
  score?: number
) {
  // Get current chapter attempt
  const { data: existingAttempt } = await supabase
    .from('chapter_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .eq('question_type', questionType)
    .eq('attempt_number', attemptNumber)
    .maybeSingle();

  // Get total questions for this chapter + type
  const tableName = questionType === 'mcq' ? 'mcqs' : 'osce_questions';
  const { count } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('chapter_id', chapterId)
    .eq('is_deleted', false);

  const totalQuestions = count || 0;

  // Get current answered count and correct count
  const { data: attempts } = await supabase
    .from('question_attempts')
    .select('is_correct, score')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .eq('question_type', questionType)
    .eq('attempt_number', attemptNumber);

  const answeredCount = attempts?.length || 0;
  let correctCount = 0;
  let totalScore = 0;

  if (questionType === 'mcq') {
    correctCount = attempts?.filter(a => a.is_correct).length || 0;
    totalScore = correctCount;
  } else {
    // OSCE: sum of scores (each question is 0-5)
    totalScore = attempts?.reduce((sum, a) => sum + (a.score || 0), 0) || 0;
    // For OSCE, "correct" means all 5 statements correct
    correctCount = attempts?.filter(a => a.score === 5).length || 0;
  }

  if (existingAttempt) {
    await supabase
      .from('chapter_attempts')
      .update({
        total_questions: totalQuestions,
        correct_count: correctCount,
        score: totalScore,
      } as never)
      .eq('id', existingAttempt.id);
  } else {
    await supabase
      .from('chapter_attempts')
      .insert([{
        user_id: userId,
        chapter_id: chapterId,
        module_id: moduleId,
        question_type: questionType,
        attempt_number: attemptNumber,
        total_questions: totalQuestions,
        correct_count: correctCount,
        score: totalScore,
        started_at: new Date().toISOString(),
      }] as never);
  }
}

/**
 * Hook to reset attempt (start new attempt)
 */
export function useResetChapterAttempt() {
  const { user } = useAuthContext();
  const { isSupportMode } = useEffectiveUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      chapterId, 
      questionType 
    }: { 
      chapterId: string; 
      questionType: PracticeQuestionType;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Block writes in support mode (impersonation)
      if (isSupportMode) {
        toast.info('View-only mode: Cannot reset progress during impersonation');
        return { newAttemptNumber: 0, blocked: true };
      }

      // Get current attempt number
      const currentAttempt = await getCurrentAttemptNumber(user.id, chapterId, questionType);

      // Mark current attempt as completed
      const { error } = await supabase
        .from('chapter_attempts')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        } as never)
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .eq('question_type', questionType)
        .eq('attempt_number', currentAttempt);

      if (error) throw error;

      return { newAttemptNumber: currentAttempt + 1, blocked: false };
    },
    onSuccess: (result, params) => {
      if (result.blocked) return;
      queryClient.invalidateQueries({ 
        queryKey: ['question-attempts', params.chapterId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['chapter-attempts', params.chapterId] 
      });
    },
  });
}

/**
 * Hook to get percentile ranking
 */
export function useChapterPercentile(
  chapterId?: string,
  questionType?: PracticeQuestionType
) {
  const { effectiveUserId } = useEffectiveUser();

  return useQuery({
    queryKey: ['chapter-percentile', chapterId, questionType, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId || !chapterId || !questionType) return null;

      // Get user's latest completed score
      const { data: latestAttempt } = await supabase
        .from('chapter_attempts')
        .select('score, total_questions')
        .eq('user_id', effectiveUserId)
        .eq('chapter_id', chapterId)
        .eq('question_type', questionType)
        .eq('is_completed', true)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestAttempt) return null;

      // Call the database function to get percentile
      const { data, error } = await supabase.rpc('get_chapter_percentile', {
        p_chapter_id: chapterId,
        p_question_type: questionType,
        p_user_score: latestAttempt.score,
      });

      if (error) {
        console.error('Error getting percentile:', error);
        return null;
      }

      return {
        percentile: data as number | null,
        score: latestAttempt.score,
        totalQuestions: latestAttempt.total_questions,
      };
    },
    enabled: !!chapterId && !!questionType && !!effectiveUserId,
    staleTime: 60000,
  });
}

/**
 * Helper to get category from percentile
 */
export function getPercentileCategory(percentile: number | null): string | null {
  if (percentile === null) return null;
  if (percentile >= 90) return 'Top 10%';
  if (percentile >= 75) return 'Above average';
  if (percentile >= 50) return 'Average';
  return 'Below average';
}
