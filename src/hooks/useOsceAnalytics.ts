import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OsceQuestionStats {
  id: string;
  history_text: string;
  image_url: string;
  chapter_id: string | null;
  chapter: {
    id: string;
    title: string;
    chapter_number: number;
    book_label: string | null;
  } | null;
  total_attempts: number;
  avg_score: number;
  score_distribution: Record<number, number>;
  statement_stats: {
    statement: string;
    correct_answer: boolean;
    correct_count: number;
    incorrect_count: number;
    accuracy: number;
  }[];
}

export interface OsceAnalyticsSummary {
  totalQuestions: number;
  totalAttempts: number;
  avgScore: number;
  avgAccuracy: number;
  questionsWithAttempts: number;
  questionsNoAttempts: number;
}

export function useOsceQuestions(moduleId?: string) {
  return useQuery({
    queryKey: ['osce-questions', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from('osce_questions')
        .select(`
          id,
          history_text,
          image_url,
          chapter_id,
          statement_1,
          statement_2,
          statement_3,
          statement_4,
          statement_5,
          answer_1,
          answer_2,
          answer_3,
          answer_4,
          answer_5,
          chapter:module_chapters(id, title, chapter_number, book_label)
        `)
        .eq('module_id', moduleId)
        .eq('is_deleted', false)
        .eq('legacy_archived', false);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });
}

export function useOsceAttemptsSummary(moduleId?: string) {
  return useQuery({
    queryKey: ['osce-attempts-summary', moduleId],
    queryFn: async (): Promise<OsceAnalyticsSummary> => {
      if (!moduleId) {
        return {
          totalQuestions: 0,
          totalAttempts: 0,
          avgScore: 0,
          avgAccuracy: 0,
          questionsWithAttempts: 0,
          questionsNoAttempts: 0,
        };
      }
      
      // Get all OSCE questions for this module
      const { data: questions, error: qError } = await supabase
        .from('osce_questions')
        .select('id')
        .eq('module_id', moduleId)
        .eq('is_deleted', false)
        .eq('legacy_archived', false);
      
      if (qError) throw qError;
      
      const questionIds = questions?.map(q => q.id) || [];
      const totalQuestions = questionIds.length;
      
      if (totalQuestions === 0) {
        return {
          totalQuestions: 0,
          totalAttempts: 0,
          avgScore: 0,
          avgAccuracy: 0,
          questionsWithAttempts: 0,
          questionsNoAttempts: 0,
        };
      }
      
      // Get attempts for these questions
      const { data: attempts, error: aError } = await supabase
        .from('question_attempts')
        .select('question_id, score, is_correct')
        .eq('question_type', 'osce')
        .in('question_id', questionIds);
      
      if (aError) throw aError;
      
      const totalAttempts = attempts?.length || 0;
      const questionsWithAttempts = new Set(attempts?.map(a => a.question_id)).size;
      
      let avgScore = 0;
      let avgAccuracy = 0;
      
      if (totalAttempts > 0) {
        const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const correctCount = attempts.filter(a => a.is_correct).length;
        avgScore = totalScore / totalAttempts;
        avgAccuracy = (correctCount / totalAttempts) * 100;
      }
      
      return {
        totalQuestions,
        totalAttempts,
        avgScore,
        avgAccuracy,
        questionsWithAttempts,
        questionsNoAttempts: totalQuestions - questionsWithAttempts,
      };
    },
    enabled: !!moduleId,
  });
}

export function useOsceQuestionStats(moduleId?: string) {
  const { data: questions } = useOsceQuestions(moduleId);
  
  return useQuery({
    queryKey: ['osce-question-stats', moduleId, questions?.length],
    queryFn: async (): Promise<OsceQuestionStats[]> => {
      if (!moduleId || !questions || questions.length === 0) return [];
      
      const questionIds = questions.map(q => q.id);
      
      // Get all attempts for these questions
      const { data: attempts, error } = await supabase
        .from('question_attempts')
        .select('question_id, score, selected_answer')
        .eq('question_type', 'osce')
        .in('question_id', questionIds);
      
      if (error) throw error;
      
      // Build stats for each question
      return questions.map(q => {
        const qAttempts = attempts?.filter(a => a.question_id === q.id) || [];
        const totalAttempts = qAttempts.length;
        
        // Score distribution (0-5)
        const scoreDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        qAttempts.forEach(a => {
          const score = Math.round(a.score || 0);
          if (score >= 0 && score <= 5) {
            scoreDistribution[score]++;
          }
        });
        
        const avgScore = totalAttempts > 0 
          ? qAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts 
          : 0;
        
        // Statement-level stats
        const statements = [
          { statement: q.statement_1, correct_answer: q.answer_1 },
          { statement: q.statement_2, correct_answer: q.answer_2 },
          { statement: q.statement_3, correct_answer: q.answer_3 },
          { statement: q.statement_4, correct_answer: q.answer_4 },
          { statement: q.statement_5, correct_answer: q.answer_5 },
        ];
        
        const statementStats = statements.map((s, idx) => {
          let correctCount = 0;
          let incorrectCount = 0;
          
          qAttempts.forEach(a => {
            try {
              const userAnswer = a.selected_answer as Record<string, boolean> | null;
              if (userAnswer && typeof userAnswer === 'object') {
                const key = `statement_${idx + 1}`;
                const userBool = userAnswer[key];
                if (userBool === s.correct_answer) {
                  correctCount++;
                } else {
                  incorrectCount++;
                }
              }
            } catch {
              // Invalid answer format
            }
          });
          
          const total = correctCount + incorrectCount;
          return {
            statement: s.statement,
            correct_answer: s.correct_answer,
            correct_count: correctCount,
            incorrect_count: incorrectCount,
            accuracy: total > 0 ? (correctCount / total) * 100 : 0,
          };
        });
        
        return {
          id: q.id,
          history_text: q.history_text,
          image_url: q.image_url,
          chapter_id: q.chapter_id,
          chapter: q.chapter,
          total_attempts: totalAttempts,
          avg_score: avgScore,
          score_distribution: scoreDistribution,
          statement_stats: statementStats,
        };
      });
    },
    enabled: !!moduleId && !!questions && questions.length > 0,
  });
}
