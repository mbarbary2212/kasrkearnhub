import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useMergedModuleConfig, expandModuleIds } from '@/hooks/useMergedModuleConfig';

export interface NeedsPracticeItem {
  id: string;
  type: 'mcq' | 'osce' | 'video' | 'flashcard' | 'matching' | 'essay' | 'case_scenario';
  title: string;
  chapterId: string;
  chapterTitle: string;
  moduleId: string;
  score?: number; // For OSCE: 0-5
  percentWatched?: number; // For Video
  attemptCount?: number;
  lastAttemptedAt?: string;
}

export interface ContentCounts {
  mcqTotal: number;
  osceTotal: number;
  videoTotal: number;
  flashcardTotal: number;
  matchingTotal: number;
  essayTotal: number;
  caseScenarioTotal: number;
  mcqAttempted: number;
  osceAttempted: number;
  matchingAttempted: number;
  essayAttempted: number;
  caseAttempted: number;
}

interface UseNeedsPracticeResult {
  mcqNeedsPractice: NeedsPracticeItem[];
  osceNeedsPractice: NeedsPracticeItem[];
  videosToComplete: NeedsPracticeItem[];
  starredFlashcards: NeedsPracticeItem[];
  matchingToComplete: NeedsPracticeItem[];
  essaysToReview: NeedsPracticeItem[];
  casesToReview: NeedsPracticeItem[];
  counts: ContentCounts;
  isLoading: boolean;
}

const EMPTY_COUNTS: ContentCounts = {
  mcqTotal: 0,
  osceTotal: 0,
  videoTotal: 0,
  flashcardTotal: 0,
  matchingTotal: 0,
  essayTotal: 0,
  caseScenarioTotal: 0,
  mcqAttempted: 0,
  osceAttempted: 0,
  matchingAttempted: 0,
  essayAttempted: 0,
  caseAttempted: 0,
};

export function useNeedsPractice(moduleId?: string): UseNeedsPracticeResult {
  const { user } = useAuthContext();
  const { data: mergedConfig } = useMergedModuleConfig();
  const expandedIds = moduleId ? expandModuleIds([moduleId], mergedConfig ?? null) : [];

  const { data, isLoading } = useQuery({
    queryKey: ['needs-practice', user?.id, moduleId, mergedConfig?.chapterMerge],
    queryFn: async () => {
      if (!user?.id || !moduleId) {
        return {
          mcq: [],
          osce: [],
          videos: [],
          flashcards: [],
          matching: [],
          essays: [],
          cases: [],
          counts: EMPTY_COUNTS,
        };
      }

      // Fetch all data in parallel
      const [
        mcqAttemptsRes,
        osceAttemptsRes,
        allMcqAttemptsRes,
        allOsceAttemptsRes,
        chaptersRes,
        mcqsRes,
        oscesRes,
        lecturesRes,
        videoProgressRes,
        flashcardsRes,
        flashcardStarsRes,
        matchingRes,
        essaysRes,
        casesRes,
        userProgressRes,
      ] = await Promise.all([
        // MCQ attempts - incorrect ones
        supabase
          .from('question_attempts')
          .select('*')
          .eq('user_id', user.id)
          .in('module_id', expandedIds)
          .eq('question_type', 'mcq')
          .eq('is_correct', false)
          .order('updated_at', { ascending: false }),
        // OSCE attempts - score <= 3
        supabase
          .from('question_attempts')
          .select('*')
          .eq('user_id', user.id)
          .in('module_id', expandedIds)
          .eq('question_type', 'osce')
          .lte('score', 3)
          .order('score', { ascending: true }),
        // All MCQ attempts (for attempted count)
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .in('module_id', expandedIds)
          .eq('question_type', 'mcq'),
        // All OSCE attempts (for attempted count)
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .in('module_id', expandedIds)
          .eq('question_type', 'osce'),
        // Chapters for this module (expanded)
        supabase
          .from('module_chapters')
          .select('id, title')
          .in('module_id', expandedIds),
        // MCQs for this module
        supabase
          .from('mcqs')
          .select('id, stem, chapter_id')
          .in('module_id', expandedIds)
          .eq('is_deleted', false),
        // OSCEs for this module
        supabase
          .from('osce_questions')
          .select('id, history_text, chapter_id')
          .in('module_id', expandedIds)
          .eq('is_deleted', false),
        // Lectures (videos) for this module
        supabase
          .from('lectures')
          .select('id, title, chapter_id, video_url')
          .in('module_id', expandedIds)
          .eq('is_deleted', false)
          .not('video_url', 'is', null),
        // Video progress for user
        supabase
          .from('video_progress')
          .select('video_id, percent_watched')
          .eq('user_id', user.id),
        // Flashcards for this module
        supabase
          .from('flashcards')
          .select('id, front, chapter_id, topic_id')
          .in('module_id', expandedIds)
          .eq('is_deleted', false),
        // User's starred flashcards
        supabase
          .from('user_flashcard_stars')
          .select('card_id, chapter_id, topic_id')
          .eq('user_id', user.id),
        // Matching questions for this module
        supabase
          .from('matching_questions')
          .select('id, instruction, chapter_id')
          .in('module_id', expandedIds)
          .eq('is_deleted', false),
        // Essays for this module
        supabase
          .from('essays')
          .select('id, title, chapter_id')
          .in('module_id', expandedIds)
          .eq('is_deleted', false),
        // Virtual patient cases for this module
        supabase
          .from('virtual_patient_cases')
          .select('id, title, chapter_id')
          .in('module_id', expandedIds)
          .eq('is_deleted', false),
        // User progress for all content types
        supabase
          .from('user_progress')
          .select('content_id, content_type, completed')
          .eq('user_id', user.id)
          .eq('completed', true),
      ]);

      const chapters = chaptersRes.data || [];
      const mcqs = mcqsRes.data || [];
      const osces = oscesRes.data || [];
      const mcqAttempts = mcqAttemptsRes.data || [];
      const osceAttempts = osceAttemptsRes.data || [];
      const allMcqAttempts = allMcqAttemptsRes.data || [];
      const allOsceAttempts = allOsceAttemptsRes.data || [];
      const lectures = lecturesRes.data || [];
      const videoProgress = videoProgressRes.data || [];
      const flashcards = flashcardsRes.data || [];
      const flashcardStars = flashcardStarsRes.data || [];
      const matchingQuestions = matchingRes.data || [];
      const essays = essaysRes.data || [];
      const cases = casesRes.data || [];
      const userProgress = userProgressRes.data || [];

      // Create lookup maps
      const chapterMap = new Map(chapters.map(c => [c.id, c.title]));
      const chapterIds = new Set(chapters.map(c => c.id));
      const mcqMap = new Map(mcqs.map(m => [m.id, m]));
      const osceMap = new Map(osces.map(o => [o.id, o]));
      const videoProgressMap = new Map(videoProgress.map(v => [v.video_id, v.percent_watched]));
      const completedContent = new Set(userProgress.map(p => `${p.content_type}:${p.content_id}`));

      // Filter flashcard stars to include this module's chapters OR topics
      const moduleFlashcardStarIds = new Set(
        flashcardStars
          .filter(s => (s.chapter_id && chapterIds.has(s.chapter_id)) || s.topic_id)
          .map(s => s.card_id)
      );

      // Compute attempted counts (distinct question IDs)
      const mcqAttemptedCount = new Set(allMcqAttempts.map(a => a.question_id)).size;
      const osceAttemptedCount = new Set(allOsceAttempts.map(a => a.question_id)).size;
      const matchingAttemptedCount = matchingQuestions.filter(mq => completedContent.has(`matching:${mq.id}`)).length;
      const essayAttemptedCount = essays.filter(e => completedContent.has(`essay:${e.id}`)).length;
      const caseAttemptedCount = cases.filter(c => completedContent.has(`case_scenario:${c.id}`)).length;

      // Content counts (zero-count rule)
      const counts: ContentCounts = {
        mcqTotal: mcqs.length,
        osceTotal: osces.length,
        videoTotal: lectures.length,
        flashcardTotal: flashcards.length,
        matchingTotal: matchingQuestions.length,
        essayTotal: essays.length,
        caseScenarioTotal: cases.length,
        mcqAttempted: mcqAttemptedCount,
        osceAttempted: osceAttemptedCount,
        matchingAttempted: matchingAttemptedCount,
        essayAttempted: essayAttemptedCount,
        caseAttempted: caseAttemptedCount,
      };

      // --- MCQ Needs Practice ---
      const mcqByQuestion = new Map<string, typeof mcqAttempts[0]>();
      mcqAttempts.forEach(attempt => {
        if (!mcqByQuestion.has(attempt.question_id)) {
          mcqByQuestion.set(attempt.question_id, attempt);
        }
      });

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

      mcqNeedsPractice.sort((a, b) => 
        new Date(b.lastAttemptedAt!).getTime() - new Date(a.lastAttemptedAt!).getTime()
      );

      // --- OSCE Needs Practice ---
      const osceByQuestion = new Map<string, typeof osceAttempts[0]>();
      osceAttempts.forEach(attempt => {
        if (!osceByQuestion.has(attempt.question_id)) {
          osceByQuestion.set(attempt.question_id, attempt);
        }
      });

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

      osceNeedsPractice.sort((a, b) => {
        if ((a.score ?? 0) !== (b.score ?? 0)) {
          return (a.score ?? 0) - (b.score ?? 0);
        }
        return new Date(b.lastAttemptedAt!).getTime() - new Date(a.lastAttemptedAt!).getTime();
      });

      // --- Videos to Complete (< 95%) ---
      const videosToComplete: NeedsPracticeItem[] = [];
      lectures.forEach(lecture => {
        if (!lecture.chapter_id) return;
        const percent = videoProgressMap.get(lecture.id) ?? 0;
        if (percent < 95) {
          videosToComplete.push({
            id: lecture.id,
            type: 'video',
            title: lecture.title,
            chapterId: lecture.chapter_id,
            chapterTitle: chapterMap.get(lecture.chapter_id) || 'Unknown Chapter',
            moduleId: moduleId,
            percentWatched: Math.round(percent),
          });
        }
      });

      // Sort videos by percent watched (lowest first)
      videosToComplete.sort((a, b) => (a.percentWatched ?? 0) - (b.percentWatched ?? 0));

      // --- Starred Flashcards ---
      const starredFlashcards: NeedsPracticeItem[] = [];
      flashcards.forEach(card => {
        const containerId = card.chapter_id || card.topic_id;
        if (moduleFlashcardStarIds.has(card.id) && containerId) {
          starredFlashcards.push({
            id: card.id,
            type: 'flashcard',
            title: card.front.length > 80 ? card.front.slice(0, 80) + '...' : card.front,
            chapterId: containerId, // Use whichever ID is available
            chapterTitle: chapterMap.get(containerId) || 'Unknown',
            moduleId: moduleId,
          });
        }
      });

      // --- Matching Questions to Complete ---
      const matchingToComplete: NeedsPracticeItem[] = [];
      matchingQuestions.forEach(mq => {
        if (!mq.chapter_id) return;
        const isCompleted = completedContent.has(`matching:${mq.id}`);
        if (!isCompleted) {
          matchingToComplete.push({
            id: mq.id,
            type: 'matching',
            title: mq.instruction.length > 80 ? mq.instruction.slice(0, 80) + '...' : mq.instruction,
            chapterId: mq.chapter_id,
            chapterTitle: chapterMap.get(mq.chapter_id) || 'Unknown Chapter',
            moduleId: moduleId,
          });
        }
      });

      // --- Essays to Review ---
      const essaysToReview: NeedsPracticeItem[] = [];
      essays.forEach(essay => {
        if (!essay.chapter_id) return;
        const isCompleted = completedContent.has(`essay:${essay.id}`);
        if (!isCompleted) {
          essaysToReview.push({
            id: essay.id,
            type: 'essay',
            title: essay.title,
            chapterId: essay.chapter_id,
            chapterTitle: chapterMap.get(essay.chapter_id) || 'Unknown Chapter',
            moduleId: moduleId,
          });
        }
      });

      // --- Case Scenarios to Review ---
      const casesToReview: NeedsPracticeItem[] = [];
      cases.forEach(caseItem => {
        if (!caseItem.chapter_id) return;
        const isCompleted = completedContent.has(`case_scenario:${caseItem.id}`);
        if (!isCompleted) {
          casesToReview.push({
            id: caseItem.id,
            type: 'case_scenario',
            title: caseItem.title,
            chapterId: caseItem.chapter_id,
            chapterTitle: chapterMap.get(caseItem.chapter_id) || 'Unknown Chapter',
            moduleId: moduleId,
          });
        }
      });

      return {
        mcq: mcqNeedsPractice.slice(0, 10),
        osce: osceNeedsPractice.slice(0, 10),
        videos: videosToComplete.slice(0, 10),
        flashcards: starredFlashcards.slice(0, 10),
        matching: matchingToComplete.slice(0, 10),
        essays: essaysToReview.slice(0, 10),
        cases: casesToReview.slice(0, 10),
        counts,
      };
    },
    enabled: !!user?.id && !!moduleId,
    staleTime: 30000,
  });

  return {
    mcqNeedsPractice: data?.mcq || [],
    osceNeedsPractice: data?.osce || [],
    videosToComplete: data?.videos || [],
    starredFlashcards: data?.flashcards || [],
    matchingToComplete: data?.matching || [],
    essaysToReview: data?.essays || [],
    casesToReview: data?.cases || [],
    counts: data?.counts || EMPTY_COUNTS,
    isLoading,
  };
}
