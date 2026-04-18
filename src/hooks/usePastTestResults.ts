import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import type { ChapterAttempt, PracticeQuestionType } from './useQuestionAttempts';

export interface PastChapterAttempt extends ChapterAttempt {
  chapter_title: string | null;
  module_name: string | null;
}

export interface AttemptQuestionDetail {
  id: string;
  question_id: string;
  question_type: PracticeQuestionType;
  selected_answer: Json;
  is_correct: boolean | null;
  score: number | null;
  created_at: string;
  question_text: string | null;
  options: string[] | null;
  correct_answer_key: string | null;
  explanation: string | null;
}

/**
 * Fetch all completed chapter attempts for the current user, joined with
 * chapter title and module name. Used for the "Past Results" listing.
 */
export function usePastTestResults(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['past-test-results', user?.id, moduleId],
    queryFn: async (): Promise<PastChapterAttempt[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from('chapter_attempts')
        .select(`
          *,
          module_chapters:chapter_id ( title ),
          modules:module_id ( name )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (moduleId) query = query.eq('module_id', moduleId);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row) => {
        const r = row as unknown as Record<string, unknown> & {
          module_chapters?: { title?: string | null } | null;
          modules?: { name?: string | null } | null;
        };
        return {
          ...(row as unknown as ChapterAttempt),
          chapter_title: r.module_chapters?.title ?? null,
          module_name: r.modules?.name ?? null,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

/**
 * Fetch the per-question details for a single chapter attempt.
 * Joins with the corresponding question table (mcqs/osce_questions) to
 * get the question text, options and correct answers.
 */
export function useAttemptDetails(attempt?: PastChapterAttempt | null) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['attempt-details', attempt?.id],
    queryFn: async (): Promise<AttemptQuestionDetail[]> => {
      if (!user?.id || !attempt) return [];

      // Fetch question_attempts for this attempt scope
      const { data: qaRows, error: qaErr } = await supabase
        .from('question_attempts')
        .select('id, question_id, question_type, selected_answer, is_correct, score, created_at')
        .eq('user_id', user.id)
        .eq('chapter_id', attempt.chapter_id)
        .eq('question_type', attempt.question_type === 'true_false' ? 'mcq' : attempt.question_type)
        .eq('attempt_number', attempt.attempt_number)
        .order('created_at', { ascending: true });

      if (qaErr) throw qaErr;
      if (!qaRows || qaRows.length === 0) return [];

      const questionIds = [...new Set(qaRows.map((q) => q.question_id))];

      // Fetch question metadata depending on type
      const isMcq = attempt.question_type === 'mcq' || attempt.question_type === 'true_false';
      let questionMap: Record<string, { text: string; options: string[] | null; correct: string | null; explanation: string | null }> = {};

      if (isMcq) {
        const { data: mcqs } = await supabase
          .from('mcqs')
          .select('id, stem, choices, correct_key, explanation')
          .in('id', questionIds);
        questionMap = Object.fromEntries(
          (mcqs || []).map((m) => {
            const opts = Array.isArray(m.choices)
              ? (m.choices as unknown[]).map((o) =>
                  typeof o === 'string' ? o : (o as { text?: string })?.text ?? JSON.stringify(o),
                )
              : null;
            return [
              m.id,
              {
                text: m.stem,
                options: opts,
                correct: m.correct_key,
                explanation: m.explanation ?? null,
              },
            ];
          }),
        );
      } else {
        const { data: osce } = await supabase
          .from('osce_questions')
          .select('id, history_text, statement_1, statement_2, statement_3, statement_4, statement_5, answer_1, answer_2, answer_3, answer_4, answer_5')
          .in('id', questionIds);
        questionMap = Object.fromEntries(
          (osce || []).map((o) => {
            const statements = [o.statement_1, o.statement_2, o.statement_3, o.statement_4, o.statement_5].filter(Boolean) as string[];
            const answers = [o.answer_1, o.answer_2, o.answer_3, o.answer_4, o.answer_5].filter((a) => a !== null && a !== undefined);
            const correctSummary = statements
              .map((s, i) => `${i + 1}. ${s} → ${answers[i] === true ? 'True' : answers[i] === false ? 'False' : '—'}`)
              .join('\n');
            return [
              o.id,
              {
                text: o.history_text || statements[0] || 'OSCE Question',
                options: statements.length > 0 ? statements : null,
                correct: correctSummary,
                explanation: null,
              },
            ];
          }),
        );
      }

      return qaRows.map((qa) => {
        const meta = questionMap[qa.question_id];
        return {
          id: qa.id,
          question_id: qa.question_id,
          question_type: qa.question_type as PracticeQuestionType,
          selected_answer: qa.selected_answer as Json,
          is_correct: qa.is_correct,
          score: qa.score,
          created_at: qa.created_at,
          question_text: meta?.text ?? null,
          options: meta?.options ?? null,
          correct_answer_key: meta?.correct ?? null,
          explanation: meta?.explanation ?? null,
        };
      });
    },
    enabled: !!user?.id && !!attempt?.id,
    staleTime: 60_000,
  });
}
