import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Json, Database } from '@/integrations/supabase/types';
import { updateChapterMetrics } from '@/lib/updateChapterMetrics';
import { captureWithContext } from '@/lib/sentry';

// Types matching the database schema
export type QuestionAttemptStatus = 'unseen' | 'attempted' | 'correct' | 'incorrect';

// Database enum type
type DbQuestionType = Database['public']['Enums']['practice_question_type'];

// Frontend type includes true_false which maps to 'mcq' in DB
export type PracticeQuestionType = 'mcq' | 'osce' | 'true_false';

// Helper to map frontend question type to database type
function mapToDbQuestionType(type: PracticeQuestionType): DbQuestionType {
  // true_false is stored as 'mcq' type in the database
  if (type === 'true_false') return 'mcq';
  return type;
}

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  question_type: PracticeQuestionType;
  chapter_id: string | null;
  topic_id: string | null;
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
  chapterId?: string;
  topicId?: string;
  moduleId: string;
  selectedAnswer: Json;
  isCorrect: boolean;
  score?: number; // For OSCE
}

/**
 * Get the current attempt number for a chapter
 */
async function getCurrentAttemptNumber(
  userId: string,
  chapterId: string,
  questionType: DbQuestionType
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
 * Get the max attempt number across ALL question types for a chapter.
 * Used by the consolidated hook to avoid per-type queries.
 */
async function getMaxAttemptNumberForChapter(
  userId: string,
  chapterId: string
): Promise<number> {
  const { data } = await supabase
    .from('chapter_attempts')
    .select('attempt_number, is_completed')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.attempt_number) {
    if (data.is_completed) {
      return data.attempt_number + 1;
    }
    return data.attempt_number;
  }
  return 1;
}

// Lightweight type for the consolidated query (only fetched columns)
export interface QuestionAttemptSummary {
  question_id: string;
  question_type: string;
  is_correct: boolean | null;
  selected_answer: Json;
  score: number | null;
  status: string;
}

/**
 * Consolidated hook: fetches ALL question attempts for a chapter in ONE query.
 * Replaces multiple per-type useChapterQuestionAttempts calls.
 */
export function useAllChapterQuestionAttempts(chapterId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['chapter-question-attempts', chapterId, user?.id],
    queryFn: async () => {
      if (!user?.id || !chapterId) return [];

      const { data, error } = await supabase
        .from('question_attempts')
        .select('question_id, question_type, is_correct, selected_answer, score, status')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as QuestionAttemptSummary[];
    },
    enabled: !!chapterId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get all question attempts for a chapter (current attempt)
 * @deprecated Use useAllChapterQuestionAttempts instead for consolidated fetching
 */
export function useChapterQuestionAttempts(
  chapterId?: string,
  questionType?: PracticeQuestionType
) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['question-attempts', chapterId, questionType, user?.id],
    queryFn: async () => {
      if (!user?.id || !chapterId) return [];

      const dbType = questionType ? mapToDbQuestionType(questionType) : 'mcq';
      
      // First get current attempt number for this chapter
      const currentAttempt = await getCurrentAttemptNumber(user.id, chapterId, dbType);

      let query = supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .eq('attempt_number', currentAttempt);

      if (questionType) {
        query = query.eq('question_type', dbType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as QuestionAttempt[];
    },
    enabled: !!chapterId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all chapter attempts for comparison
 */
export function useChapterAttemptHistory(
  chapterId?: string,
  questionType?: PracticeQuestionType
) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['chapter-attempts', chapterId, questionType, user?.id],
    queryFn: async () => {
      if (!user?.id || !chapterId) return [];

      const dbType = questionType ? mapToDbQuestionType(questionType) : undefined;

      let query = supabase
        .from('chapter_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .order('attempt_number', { ascending: true });

      if (dbType) {
        query = query.eq('question_type', dbType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as ChapterAttempt[];
    },
    enabled: !!chapterId && !!user?.id,
    staleTime: 30000,
  });
}

/**
 * Hook to save a question attempt (auto-save)
 */
export function useSaveQuestionAttempt() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveQuestionAttemptParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      const {
        questionId, questionType, chapterId, topicId,
        moduleId, selectedAnswer, isCorrect, score,
      } = params;

      const dbType = mapToDbQuestionType(questionType);

      const { data, error } = await supabase.rpc('save_question_attempt', {
        p_question_id:     questionId,
        p_question_type:   dbType,
        p_chapter_id:      chapterId ?? null,
        p_topic_id:        topicId ?? null,
        p_module_id:       moduleId,
        p_selected_answer: selectedAnswer as unknown as Json,
        p_is_correct:      isCorrect,
        p_score:           score ?? null,
      });

      if (error) {
        captureWithContext(error, {
          tags: {
            feature: 'db_write',
            table: 'question_attempts',
            operation: 'insert',
          },
          extra: {
            student_user_id: user.id,
            question_id: questionId,
            question_type: questionType,
            chapter_id: chapterId,
            module_id: moduleId,
            error_code: (error as any)?.code,
            error_message: error.message,
            supabase_hint: (error as any)?.hint,
          },
        });
        throw error;
      }

      return {
        success: true,
        chapterId,
        topicId,
        attemptNumber: (data as { attempt_number: number })?.attempt_number,
      };
    },
    onSuccess: (result, params) => {
      // Invalidate queries to refresh UI
      if (result.chapterId) {
        queryClient.invalidateQueries({ 
          queryKey: ['question-attempts', result.chapterId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['chapter-attempts', result.chapterId] 
        });
        queryClient.invalidateQueries({
          queryKey: ['student-chapter-metrics']
        });

        // Fire-and-forget: update chapter metrics
        if (params.moduleId && (params.questionType === 'mcq' || params.questionType === 'true_false')) {
          updateChapterMetrics({
            type: 'mcq',
            studentId: user!.id,
            moduleId: params.moduleId,
            chapterId: result.chapterId,
            isCorrect: params.isCorrect,
          });
        }
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ 
          queryKey: ['content-progress', 'topic_id', result.topicId] 
        });
      }
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
  questionType: DbQuestionType,
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
  // Note: true_false uses 'mcq' in DB, so we query mcqs table for that
  let tableName: 'mcqs' | 'osce_questions';
  if (questionType === 'mcq') {
    tableName = 'mcqs';
  } else {
    tableName = 'osce_questions';
  }
  
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
      })
      .eq('id', existingAttempt.id);
  } else {
    await supabase
      .from('chapter_attempts')
      .insert({
        user_id: userId,
        chapter_id: chapterId,
        module_id: moduleId,
        question_type: questionType,
        attempt_number: attemptNumber,
        total_questions: totalQuestions,
        correct_count: correctCount,
        score: totalScore,
        started_at: new Date().toISOString(),
      });
  }
}

/**
 * Hook to reset attempt — fully erases progress on this chapter for the given
 * question type by deleting BOTH question_attempts and chapter_attempts rows
 * for the current user. Previously this only marked the chapter attempt as
 * completed, which left stats visible.
 */
export function useResetChapterAttempt() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chapterId,
      questionType,
    }: {
      chapterId: string;
      questionType: PracticeQuestionType;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const dbType = mapToDbQuestionType(questionType);

      // 1) Delete per-question attempts for this user/chapter/type
      const { error: qaError } = await supabase
        .from('question_attempts')
        .delete()
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .eq('question_type', dbType);

      if (qaError) {
        console.error('[useResetChapterAttempt] question_attempts delete failed:', qaError);
        throw qaError;
      }

      // 2) Delete the aggregated chapter attempts for the same scope
      const { error: caError } = await supabase
        .from('chapter_attempts')
        .delete()
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .eq('question_type', dbType);

      if (caError) {
        console.error('[useResetChapterAttempt] chapter_attempts delete failed:', caError);
        throw caError;
      }

      return { chapterId, questionType };
    },
    onSuccess: (_, params) => {
      // Invalidate every cache that derives from these tables so the UI
      // reflects the wipe without a page reload.
      queryClient.invalidateQueries({ queryKey: ['question-attempts', params.chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-attempts', params.chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-question-attempts', params.chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-percentile', params.chapterId] });
      queryClient.invalidateQueries({ queryKey: ['student-chapter-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['content-progress'] });
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
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['chapter-percentile', chapterId, questionType, user?.id],
    queryFn: async () => {
      if (!user?.id || !chapterId || !questionType) return null;

      const dbType = mapToDbQuestionType(questionType);

      // Get user's latest completed score
      const { data: latestAttempt } = await supabase
        .from('chapter_attempts')
        .select('score, total_questions')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .eq('question_type', dbType)
        .eq('is_completed', true)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestAttempt) return null;

      // Call the database function to get percentile
      const { data, error } = await supabase.rpc('get_chapter_percentile', {
        p_chapter_id: chapterId,
        p_question_type: dbType,
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
    enabled: !!chapterId && !!questionType && !!user?.id,
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
