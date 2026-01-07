import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface NeedsPracticeItem {
  id: string;
  type: 'mcq' | 'osce';
  title: string;
  chapterId: string;
  chapterTitle: string;
  moduleId: string;
  score?: number; // For OSCE: 0-5
  attemptCount: number;
  lastAttemptedAt: string;
}

interface UseNeedsPracticeResult {
  mcqNeedsPractice: NeedsPracticeItem[];
  osceNeedsPractice: NeedsPracticeItem[];
  isLoading: boolean;
}

export function useNeedsPractice(moduleId?: string): UseNeedsPracticeResult {
  const { user } = useAuthContext();

  const { data, isLoading } = useQuery({
    queryKey: ['needs-practice', user?.id, moduleId],
    queryFn: async (): Promise<{ mcq: NeedsPracticeItem[]; osce: NeedsPracticeItem[] }> => {
      if (!user?.id || !moduleId) {
        return { mcq: [], osce: [] };
      }

      // Fetch question attempts for this module where status shows needs practice
      // MCQ: is_correct = false
      // OSCE: score <= 3 (out of 5)
      const [mcqAttemptsRes, osceAttemptsRes, chaptersRes, mcqsRes, oscesRes] = await Promise.all([
        // MCQ attempts - incorrect ones
        supabase
          .from('question_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('module_id', moduleId)
          .eq('question_type', 'mcq')
          .eq('is_correct', false)
          .order('updated_at', { ascending: false }),
        // OSCE attempts - score <= 3
        supabase
          .from('question_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('module_id', moduleId)
          .eq('question_type', 'osce')
          .lte('score', 3)
          .order('score', { ascending: true }),
        // Chapters for this module
        supabase
          .from('module_chapters')
          .select('id, title')
          .eq('module_id', moduleId),
        // MCQs for this module
        supabase
          .from('mcqs')
          .select('id, stem, chapter_id')
          .eq('module_id', moduleId)
          .eq('is_deleted', false),
        // OSCEs for this module
        supabase
          .from('osce_questions')
          .select('id, history_text, chapter_id')
          .eq('module_id', moduleId)
          .eq('is_deleted', false),
      ]);

      const chapters = chaptersRes.data || [];
      const mcqs = mcqsRes.data || [];
      const osces = oscesRes.data || [];
      const mcqAttempts = mcqAttemptsRes.data || [];
      const osceAttempts = osceAttemptsRes.data || [];

      // Create lookup maps
      const chapterMap = new Map(chapters.map(c => [c.id, c.title]));
      const mcqMap = new Map(mcqs.map(m => [m.id, m]));
      const osceMap = new Map(osces.map(o => [o.id, o]));

      // Deduplicate by question_id (keep most recent attempt per question)
      const mcqByQuestion = new Map<string, typeof mcqAttempts[0]>();
      mcqAttempts.forEach(attempt => {
        if (!mcqByQuestion.has(attempt.question_id)) {
          mcqByQuestion.set(attempt.question_id, attempt);
        }
      });

      const osceByQuestion = new Map<string, typeof osceAttempts[0]>();
      osceAttempts.forEach(attempt => {
        // For OSCE, sort by lowest score first (already sorted by DB), so first wins
        if (!osceByQuestion.has(attempt.question_id)) {
          osceByQuestion.set(attempt.question_id, attempt);
        }
      });

      // Build MCQ needs practice list
      const mcqNeedsPractice: NeedsPracticeItem[] = [];
      mcqByQuestion.forEach((attempt, questionId) => {
        const mcq = mcqMap.get(questionId);
        if (mcq && attempt.chapter_id) {
          mcqNeedsPractice.push({
            id: questionId,
            type: 'mcq',
            title: mcq.stem.length > 80 ? mcq.stem.slice(0, 80) + '...' : mcq.stem,
            chapterId: attempt.chapter_id,
            chapterTitle: chapterMap.get(attempt.chapter_id) || 'Unknown Chapter',
            moduleId: moduleId,
            attemptCount: attempt.attempt_number,
            lastAttemptedAt: attempt.updated_at,
          });
        }
      });

      // Build OSCE needs practice list (score <= 3)
      const osceNeedsPractice: NeedsPracticeItem[] = [];
      osceByQuestion.forEach((attempt, questionId) => {
        const osce = osceMap.get(questionId);
        if (osce && attempt.chapter_id && attempt.score !== null && attempt.score <= 3) {
          osceNeedsPractice.push({
            id: questionId,
            type: 'osce',
            title: osce.history_text.length > 80 ? osce.history_text.slice(0, 80) + '...' : osce.history_text,
            chapterId: attempt.chapter_id,
            chapterTitle: chapterMap.get(attempt.chapter_id) || 'Unknown Chapter',
            moduleId: moduleId,
            score: attempt.score,
            attemptCount: attempt.attempt_number,
            lastAttemptedAt: attempt.updated_at,
          });
        }
      });

      // Sort MCQs by most recently attempted
      mcqNeedsPractice.sort((a, b) => 
        new Date(b.lastAttemptedAt).getTime() - new Date(a.lastAttemptedAt).getTime()
      );

      // Sort OSCEs by lowest score first, then most recent
      osceNeedsPractice.sort((a, b) => {
        if ((a.score ?? 0) !== (b.score ?? 0)) {
          return (a.score ?? 0) - (b.score ?? 0);
        }
        return new Date(b.lastAttemptedAt).getTime() - new Date(a.lastAttemptedAt).getTime();
      });

      return {
        mcq: mcqNeedsPractice.slice(0, 10), // Limit to top 10
        osce: osceNeedsPractice.slice(0, 10),
      };
    },
    enabled: !!user?.id && !!moduleId,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    mcqNeedsPractice: data?.mcq || [],
    osceNeedsPractice: data?.osce || [],
    isLoading,
  };
}
