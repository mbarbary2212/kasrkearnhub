import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchingQuestionStats {
  id: string;
  instruction: string;
  chapter_id: string | null;
  chapter: {
    id: string;
    title: string;
    chapter_number: number;
    book_label: string | null;
  } | null;
  total_completions: number;
}

export interface MatchingAnalyticsSummary {
  totalQuestions: number;
  totalCompletions: number;
  questionsWithCompletions: number;
  questionsNoCompletions: number;
}

export function useMatchingQuestionsList(moduleId?: string) {
  return useQuery({
    queryKey: ['matching-questions-list', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from('matching_questions')
        .select(`
          id,
          instruction,
          chapter_id,
          chapter:module_chapters(id, title, chapter_number, book_label)
        `)
        .eq('module_id', moduleId)
        .eq('is_deleted', false);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });
}

export function useMatchingAttemptsSummary(moduleId?: string) {
  return useQuery({
    queryKey: ['matching-attempts-summary', moduleId],
    queryFn: async (): Promise<MatchingAnalyticsSummary> => {
      if (!moduleId) {
        return {
          totalQuestions: 0,
          totalCompletions: 0,
          questionsWithCompletions: 0,
          questionsNoCompletions: 0,
        };
      }
      
      // Get all matching questions for this module
      const { data: questions, error: qError } = await supabase
        .from('matching_questions')
        .select('id')
        .eq('module_id', moduleId)
        .eq('is_deleted', false);
      
      if (qError) throw qError;
      
      const questionIds = questions?.map(q => q.id) || [];
      const totalQuestions = questionIds.length;
      
      if (totalQuestions === 0) {
        return {
          totalQuestions: 0,
          totalCompletions: 0,
          questionsWithCompletions: 0,
          questionsNoCompletions: 0,
        };
      }
      
      // Get completions from user_progress for these questions
      // Matching questions are tracked via user_progress with content_type = 'matching'
      const { data: progress, error: pError } = await supabase
        .from('user_progress')
        .select('content_id, completed')
        .eq('content_type', 'matching')
        .eq('completed', true)
        .in('content_id', questionIds);
      
      if (pError) throw pError;
      
      const totalCompletions = progress?.length || 0;
      const questionsWithCompletions = new Set(progress?.map(p => p.content_id)).size;
      
      return {
        totalQuestions,
        totalCompletions,
        questionsWithCompletions,
        questionsNoCompletions: totalQuestions - questionsWithCompletions,
      };
    },
    enabled: !!moduleId,
  });
}

export function useMatchingQuestionStats(moduleId?: string) {
  const { data: questions } = useMatchingQuestionsList(moduleId);
  
  return useQuery({
    queryKey: ['matching-question-stats', moduleId, questions?.length],
    queryFn: async (): Promise<MatchingQuestionStats[]> => {
      if (!moduleId || !questions || questions.length === 0) return [];
      
      const questionIds = questions.map(q => q.id);
      
      // Get completions from user_progress for these questions
      const { data: progress, error } = await supabase
        .from('user_progress')
        .select('content_id')
        .eq('content_type', 'matching')
        .eq('completed', true)
        .in('content_id', questionIds);
      
      if (error) throw error;
      
      // Count completions per question
      const completionCounts: Record<string, number> = {};
      progress?.forEach(p => {
        completionCounts[p.content_id] = (completionCounts[p.content_id] || 0) + 1;
      });
      
      // Build stats for each question
      return questions.map(q => ({
        id: q.id,
        instruction: q.instruction,
        chapter_id: q.chapter_id,
        chapter: q.chapter,
        total_completions: completionCounts[q.id] || 0,
      }));
    },
    enabled: !!moduleId && !!questions && questions.length > 0,
  });
}
