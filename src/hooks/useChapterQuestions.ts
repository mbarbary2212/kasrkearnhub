import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChapterQuestion {
  id: string;
  chapter_id: string;
  module_id: string;
  user_id: string;
  question_text: string;
  is_answered: boolean;
  answer_text: string | null;
  answered_by: string | null;
  answered_at: string | null;
  upvote_count: number;
  is_pinned: boolean;
  is_hidden: boolean;
  created_at: string;
  user_has_upvoted?: boolean;
  author_name?: string;
  answerer_name?: string;
}

export function useChapterQuestions(chapterId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['chapter-questions', chapterId],
    enabled: !!chapterId && !!user,
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from('chapter_questions')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('is_pinned', { ascending: false })
        .order('upvote_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get upvotes for current user
      const { data: upvotes } = await supabase
        .from('chapter_question_upvotes')
        .select('question_id')
        .eq('user_id', user!.id);

      const upvotedSet = new Set((upvotes || []).map(u => u.question_id));

      // Get author names
      const userIds = [...new Set([
        ...questions.map(q => q.user_id),
        ...questions.filter(q => q.answered_by).map(q => q.answered_by!),
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || p.email || 'Anonymous']));

      return questions.map(q => ({
        ...q,
        user_has_upvoted: upvotedSet.has(q.id),
        author_name: profileMap.get(q.user_id) || 'Anonymous',
        answerer_name: q.answered_by ? profileMap.get(q.answered_by) || 'Staff' : null,
      })) as ChapterQuestion[];
    },
  });
}

export function useTrendingQuestions(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['trending-questions', moduleId],
    enabled: !!moduleId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_questions')
        .select('*, module_chapters!chapter_questions_chapter_id_fkey(title)')
        .eq('module_id', moduleId!)
        .eq('is_hidden', false)
        .eq('is_answered', false)
        .order('upvote_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data || []).map(q => ({
        ...q,
        chapter_title: (q as any).module_chapters?.title || 'Unknown Chapter',
      }));
    },
  });
}

export function useAskQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ chapterId, moduleId, questionText }: { chapterId: string; moduleId: string; questionText: string }) => {
      const { error } = await supabase.from('chapter_questions').insert({
        chapter_id: chapterId,
        module_id: moduleId,
        user_id: user!.id,
        question_text: questionText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-questions', vars.chapterId] });
      queryClient.invalidateQueries({ queryKey: ['trending-questions', vars.moduleId] });
      toast.success('Question submitted!');
    },
    onError: () => toast.error('Failed to submit question'),
  });
}

export function useToggleUpvote() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ questionId, hasUpvoted, chapterId }: { questionId: string; hasUpvoted: boolean; chapterId: string }) => {
      if (hasUpvoted) {
        const { error } = await supabase
          .from('chapter_question_upvotes')
          .delete()
          .eq('question_id', questionId)
          .eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chapter_question_upvotes')
          .insert({ question_id: questionId, user_id: user!.id });
        if (error) throw error;
      }
      return chapterId;
    },
    onSuccess: (chapterId) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-questions', chapterId] });
    },
  });
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ questionId, answerText, chapterId }: { questionId: string; answerText: string; chapterId: string }) => {
      const { error } = await supabase
        .from('chapter_questions')
        .update({
          answer_text: answerText.trim(),
          answered_by: user!.id,
          answered_at: new Date().toISOString(),
          is_answered: true,
        })
        .eq('id', questionId);
      if (error) throw error;
      return chapterId;
    },
    onSuccess: (chapterId) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-questions', chapterId] });
      toast.success('Answer posted!');
    },
    onError: () => toast.error('Failed to post answer'),
  });
}

export function useTogglePinQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, isPinned, chapterId }: { questionId: string; isPinned: boolean; chapterId: string }) => {
      const { error } = await supabase
        .from('chapter_questions')
        .update({ is_pinned: !isPinned })
        .eq('id', questionId);
      if (error) throw error;
      return chapterId;
    },
    onSuccess: (chapterId) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-questions', chapterId] });
    },
  });
}

export function useHideQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, chapterId }: { questionId: string; chapterId: string }) => {
      const { error } = await supabase
        .from('chapter_questions')
        .update({ is_hidden: true })
        .eq('id', questionId);
      if (error) throw error;
      return chapterId;
    },
    onSuccess: (chapterId) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-questions', chapterId] });
      toast.success('Question hidden');
    },
  });
}
