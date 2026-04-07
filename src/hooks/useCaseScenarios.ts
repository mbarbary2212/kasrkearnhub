import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CaseScenario {
  id: string;
  stem: string;
  chapter_id: string | null;
  module_id: string | null;
  topic_id: string | null;
  difficulty: string;
  display_order: number;
  is_deleted: boolean;
  tags: string[] | null;
  created_at: string;
  section_id?: string | null;
}

export interface CaseScenarioQuestion {
  id: string;
  case_id: string;
  question_text: string;
  question_type: string;
  max_marks: number;
  display_order: number;
  explanation: string | null;
  rubric_json?: unknown;
  reasoning_domain?: string | null;
}

export function useChapterCaseScenarios(chapterId?: string) {
  return useQuery({
    queryKey: ['case-scenarios', 'chapter', chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_scenarios')
        .select('id, stem, chapter_id, module_id, topic_id, difficulty, display_order, is_deleted, tags, created_at, section_id')
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CaseScenario[];
    },
  });
}

export function useChapterCaseScenarioCount(chapterId?: string) {
  return useQuery({
    queryKey: ['case-scenario-count', 'chapter', chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('case_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false);
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useTopicCaseScenarios(topicId?: string) {
  return useQuery({
    queryKey: ['case-scenarios', 'topic', topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_scenarios')
        .select('id, stem, chapter_id, module_id, topic_id, difficulty, display_order, is_deleted, tags, created_at, section_id')
        .eq('topic_id', topicId!)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CaseScenario[];
    },
  });
}

export function useTopicCaseScenarioCount(topicId?: string) {
  return useQuery({
    queryKey: ['case-scenario-count', 'topic', topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('case_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('topic_id', topicId!)
        .eq('is_deleted', false);
      if (error) throw error;
      return count || 0;
    },
  });
}

/**
 * Fetch a single case scenario with its sub-questions (NO model_answer).
 * Strict answer isolation — model_answer is only fetched on-demand.
 */
export function useCaseScenarioWithQuestions(caseId?: string) {
  return useQuery({
    queryKey: ['case-scenario-detail', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const [caseRes, questionsRes] = await Promise.all([
        supabase
          .from('case_scenarios')
          .select('id, stem, chapter_id, module_id, topic_id, difficulty, display_order, tags')
          .eq('id', caseId!)
          .single(),
        supabase
          .from('case_scenario_questions')
          .select('id, case_id, question_text, question_type, max_marks, display_order, explanation, rubric_json, reasoning_domain')
          .eq('case_id', caseId!)
          .order('display_order', { ascending: true }),
      ]);
      if (caseRes.error) throw caseRes.error;
      if (questionsRes.error) throw questionsRes.error;
      return {
        ...(caseRes.data as CaseScenario),
        questions: (questionsRes.data || []) as CaseScenarioQuestion[],
      };
    },
  });
}

/**
 * On-demand fetch of model_answer for a single case sub-question.
 * Mirrors useEssayModelAnswer pattern.
 */
export function useCaseQuestionModelAnswer(questionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['case-question-model-answer', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_scenario_questions')
        .select('model_answer')
        .eq('id', questionId!)
        .single();
      if (error) throw error;
      return (data as any)?.model_answer as string | null;
    },
    enabled: !!questionId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch case scenarios for exam use — strict isolation, no model_answer.
 * Returns cases with their sub-questions (question_text, rubric_json, max_marks only).
 */
export function useExamCaseScenarios(chapterId?: string, topicId?: string) {
  return useQuery({
    queryKey: ['exam-case-scenarios', chapterId, topicId],
    queryFn: async () => {
      let caseQuery = supabase
        .from('case_scenarios')
        .select('id, stem, difficulty, chapter_id, module_id, topic_id')
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (chapterId) caseQuery = caseQuery.eq('chapter_id', chapterId);
      else if (topicId) caseQuery = caseQuery.eq('topic_id', topicId);
      else return [];

      const { data: cases, error: casesErr } = await caseQuery;
      if (casesErr) throw casesErr;
      if (!cases || cases.length === 0) return [];

      const caseIds = cases.map(c => c.id);
      const { data: questions, error: qErr } = await supabase
        .from('case_scenario_questions')
        .select('id, case_id, question_text, question_type, max_marks, display_order, rubric_json, reasoning_domain')
        .in('case_id', caseIds)
        .order('display_order', { ascending: true });
      if (qErr) throw qErr;

      return cases.map(c => ({
        ...c,
        questions: (questions || []).filter(q => q.case_id === c.id),
      }));
    },
    enabled: !!(chapterId || topicId),
  });
}
