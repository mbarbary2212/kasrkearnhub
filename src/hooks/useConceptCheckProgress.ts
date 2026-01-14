import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useInvalidateChapterProgress } from './useChapterProgress';
import { Json } from '@/integrations/supabase/types';

/**
 * Hook to fetch user's concept check attempts for a chapter
 */
export function useConceptCheckAttempts(chapterId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['concept-check-attempts', chapterId, user?.id],
    queryFn: async () => {
      if (!user?.id || !chapterId) return [];

      // Query attempts for guided_explanation type questions
      // We use a composite key format: resourceId_questionIndex
      const { data, error } = await supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('question_type', 'guided_explanation')
        .like('question_id', `%_${chapterId}_%`);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!chapterId,
  });
}

/**
 * Hook to save a concept check attempt
 */
export function useSaveConceptCheckAttempt() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { invalidateChapter } = useInvalidateChapterProgress();

  return useMutation({
    mutationFn: async ({
      questionId,
      chapterId,
      isCorrect,
      score,
    }: {
      questionId: string;
      chapterId: string;
      isCorrect: boolean;
      score: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Use upsert to track the latest attempt
      const { error } = await supabase.from('question_attempts').upsert(
        {
          user_id: user.id,
          question_id: questionId,
          question_type: 'guided_explanation' as const,
          is_correct: isCorrect,
          selected_answer: { score } as Json,
        },
        { onConflict: 'user_id,question_id,question_type' }
      );

      if (error) throw error;
      return { questionId, chapterId };
    },
    onSuccess: ({ chapterId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['concept-check-attempts', chapterId] });
      invalidateChapter(chapterId);
    },
  });
}

/**
 * Get count of guided explanations with rubrics for a chapter
 */
export function useConceptCheckCount(chapterId?: string, studyResources?: any[]) {
  return studyResources
    ?.filter(r => r.resource_type === 'guided_explanation')
    ?.reduce((count, resource) => {
      const questions = resource.content?.guided_questions || [];
      const questionsWithRubrics = questions.filter(
        (q: any) => q.rubric && q.rubric.required_concepts?.length > 0
      );
      return count + questionsWithRubrics.length;
    }, 0) || 0;
}
