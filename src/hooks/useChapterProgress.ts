import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { extractYouTubeId, extractGoogleDriveId, normalizeVideoInput, isVimeoUrl } from '@/lib/video';

// Re-export extractVimeoId as a no-op for backward compatibility (Vimeo disabled)
export function extractVimeoId(_url: string | null | undefined): string | null {
  return null;
}

/**
 * Progress Tracking System
 * 
 * INTERNAL TERMINOLOGY:
 * - "Learning Unit" = Chapter or Lecture (never exposed to users)
 * - "Item" = Any practice-based interaction (MCQ, OSCE, Essay, Case Scenario, Matching)
 * 
 * COMPLETION RULES:
 * - MCQ: Answer submitted and feedback shown
 * - OSCE: All T/F statements submitted
 * - Short Answer (Essay): Model answer revealed OR marked as done
 * - Case Scenario: Full solution viewed
 * - Matching: Interaction completed
 * - Video: Watched >= 80% of duration
 * 
 * PROGRESS CALCULATION (Weighted):
 * - Practice Progress (60%): (Completed Practice Items / Total Practice Items) × 100
 * - Video Progress (40%): Duration-weighted average of watch percentages
 * - Overall Progress = 0.60 × Practice + 0.40 × Video
 * 
 * Edge cases:
 * - No videos → Overall = Practice progress (no penalty)
 * - No practice items → Overall = Video progress (no penalty)
 * - Both empty → 0
 */

// Weights for overall progress calculation
const PRACTICE_WEIGHT = 0.60;
const VIDEO_WEIGHT = 0.40;
const VIDEO_COMPLETION_THRESHOLD = 80; // percent

// Content types that can be tracked for progress
export type TrackableContentType = 
  | 'lecture' 
  | 'resource' 
  | 'mcq' 
  | 'true_false'
  | 'essay' 
  | 'practical' 
  | 'osce' 
  | 'matching';

interface ChapterProgressData {
  totalProgress: number;        // Weighted overall progress
  practiceProgress: number;     // Practice items completion %
  videoProgress: number;        // Video watch completion %
  practiceCompleted: number;
  practiceTotal: number;
  videosCompleted: number;      // Videos with >= 80% watched
  videosTotal: number;
  // Legacy fields for backward compatibility
  resourcesProgress: number;
  resourcesCompleted: number;
  resourcesTotal: number;
  completedItems: number;
  totalItems: number;
}

/**
 * Extract video ID from a video URL (YouTube or Google Drive)
 * Note: Vimeo support temporarily disabled - returns null for Vimeo URLs
 */
function extractVideoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  // Skip Vimeo URLs for now (playback disabled)
  if (isVimeoUrl(videoUrl)) return null;
  const normalized = normalizeVideoInput(videoUrl);
  return extractYouTubeId(normalized) || extractGoogleDriveId(normalized);
}

export function useChapterProgress(chapterId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['chapter-progress', chapterId, user?.id],
    queryFn: async (): Promise<ChapterProgressData> => {
      const emptyResult: ChapterProgressData = {
        totalProgress: 0,
        practiceProgress: 0,
        videoProgress: 0,
        practiceCompleted: 0,
        practiceTotal: 0,
        videosCompleted: 0,
        videosTotal: 0,
        resourcesProgress: 0,
        resourcesCompleted: 0,
        resourcesTotal: 0,
        completedItems: 0,
        totalItems: 0,
      };

      if (!user?.id || !chapterId) return emptyResult;

      // Fetch all content counts for this chapter
      const [
        mcqsRes,
        essaysRes,
        oscesRes,
        matchingRes,
        lecturesRes,
        // Attempt counts
        mcqAttemptsRes,
        essayAttemptsRes,
        osceAttemptsRes,
        matchingAttemptsRes,
        // Video progress
        videoProgressRes,
      ] = await Promise.all([
        // Content counts
        supabase
          .from('mcqs')
          .select('id', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('is_deleted', false),
        supabase
          .from('essays')
          .select('id', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('is_deleted', false),
        supabase
          .from('osce_questions')
          .select('id', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('is_deleted', false),
        supabase
          .from('matching_questions')
          .select('id', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('is_deleted', false),
        supabase
          .from('lectures')
          .select('id, video_url')
          .eq('chapter_id', chapterId)
          .eq('is_deleted', false),
        // Attempt counts (distinct items attempted by this user)
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'mcq')
          .in('question_id', 
            (await supabase
              .from('mcqs')
              .select('id')
              .eq('chapter_id', chapterId)
              .eq('is_deleted', false)
            ).data?.map(m => m.id) || []
          ),
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'mcq')
          .in('question_id',
            (await supabase
              .from('essays')
              .select('id')
              .eq('chapter_id', chapterId)
              .eq('is_deleted', false)
            ).data?.map(e => e.id) || []
          ),
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'osce')
          .in('question_id',
            (await supabase
              .from('osce_questions')
              .select('id')
              .eq('chapter_id', chapterId)
              .eq('is_deleted', false)
            ).data?.map(o => o.id) || []
          ),
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'mcq')
          .in('question_id',
            (await supabase
              .from('matching_questions')
              .select('id')
              .eq('chapter_id', chapterId)
              .eq('is_deleted', false)
            ).data?.map(m => m.id) || []
          ),
        // Video progress for this user
        supabase
          .from('video_progress')
          .select('video_id, percent_watched')
          .eq('user_id', user.id),
      ]);

      // Calculate practice totals
      const mcqTotal = mcqsRes.count || 0;
      const essayTotal = essaysRes.count || 0;
      const osceTotal = oscesRes.count || 0;
      const matchingTotal = matchingRes.count || 0;
      const practiceTotal = mcqTotal + essayTotal + osceTotal + matchingTotal;

      // Calculate practice completed (unique items)
      const mcqCompleted = new Set(mcqAttemptsRes.data?.map(a => a.question_id) || []).size;
      const essayCompleted = new Set(essayAttemptsRes.data?.map(a => a.question_id) || []).size;
      const osceCompleted = new Set(osceAttemptsRes.data?.map(a => a.question_id) || []).size;
      const matchingCompleted = new Set(matchingAttemptsRes.data?.map(a => a.question_id) || []).size;
      const practiceCompleted = mcqCompleted + essayCompleted + osceCompleted + matchingCompleted;

      // Calculate video progress
      const lectures = lecturesRes.data || [];
      const videoProgressMap = new Map(
        (videoProgressRes.data || []).map(vp => [vp.video_id, vp.percent_watched])
      );

      let videosTotal = 0;
      let videosCompleted = 0;
      let totalVideoProgress = 0;

      for (const lecture of lectures) {
        const videoId = extractVideoId(lecture.video_url);
        if (videoId) {
          videosTotal++;
          const progress = videoProgressMap.get(videoId) || 0;
          totalVideoProgress += progress;
          if (progress >= VIDEO_COMPLETION_THRESHOLD) {
            videosCompleted++;
          }
        }
      }

      // Calculate percentages
      const practiceProgress = practiceTotal > 0 
        ? Math.round((practiceCompleted / practiceTotal) * 100) 
        : 0;
      
      const videoProgress = videosTotal > 0 
        ? Math.round(totalVideoProgress / videosTotal) 
        : 0;

      // Calculate weighted total progress
      let totalProgress: number;
      if (practiceTotal === 0 && videosTotal === 0) {
        totalProgress = 0;
      } else if (practiceTotal === 0) {
        totalProgress = videoProgress;
      } else if (videosTotal === 0) {
        totalProgress = practiceProgress;
      } else {
        totalProgress = Math.round(
          PRACTICE_WEIGHT * practiceProgress + VIDEO_WEIGHT * videoProgress
        );
      }

      return {
        totalProgress,
        practiceProgress,
        videoProgress,
        practiceCompleted,
        practiceTotal,
        videosCompleted,
        videosTotal,
        // Legacy fields
        resourcesProgress: videoProgress,
        resourcesCompleted: videosCompleted,
        resourcesTotal: videosTotal,
        completedItems: practiceCompleted + videosCompleted,
        totalItems: practiceTotal + videosTotal,
      };
    },
    enabled: !!user?.id && !!chapterId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to invalidate chapter progress when content is completed
 */
export function useInvalidateChapterProgress() {
  const queryClient = useQueryClient();

  return {
    invalidateChapter: (chapterId: string) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-progress', chapterId] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
    },
  };
}

/**
 * Hook to mark an item as complete (MCQ, Essay, OSCE, Case, Matching)
 * 
 * Provides a simple API: markComplete(questionId, questionType, chapterId)
 */
export function useMarkItemComplete() {
  const { user } = useAuthContext();
  const { invalidateChapter } = useInvalidateChapterProgress();

  const mutation = useMutation({
    mutationFn: async ({
      questionId,
      questionType,
      chapterId,
      isCorrect,
      selectedAnswer,
    }: {
      questionId: string;
      questionType: 'mcq' | 'true_false' | 'essay' | 'osce' | 'matching';
      chapterId?: string;
      isCorrect?: boolean;
      selectedAnswer?: unknown;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Map to DB enum type (question_attempts table uses 'mcq' | 'osce' | 'guided_explanation')
      // true_false is stored as 'mcq' in the database since DB enum doesn't include it yet
      let dbQuestionType: 'mcq' | 'osce' | 'guided_explanation';
      if (questionType === 'true_false') {
        dbQuestionType = 'mcq';
      } else if (questionType === 'osce') {
        dbQuestionType = 'osce';
      } else {
        dbQuestionType = 'mcq';
      }

      const { error } = await supabase.from('question_attempts').upsert(
        {
          user_id: user.id,
          question_id: questionId,
          question_type: dbQuestionType,
          is_correct: isCorrect ?? null,
          selected_answer: (selectedAnswer ?? null) as import('@/integrations/supabase/types').Json,
          chapter_id: chapterId || null,
          module_id: '',
          attempt_number: 1,
          status: isCorrect ? 'correct' : 'incorrect',
        },
        { onConflict: 'user_id,question_id,question_type,attempt_number' }
      );

      if (error) throw error;
      return { questionId, chapterId: chapterId || '' };
    },
    onSuccess: ({ chapterId }) => {
      if (chapterId) {
        invalidateChapter(chapterId);
      }
    },
  });

  // Wrapper function that accepts simple arguments for backward compatibility
  const markComplete = (
    questionId: string,
    questionType: 'mcq' | 'true_false' | 'essay' | 'osce' | 'matching',
    chapterId?: string
  ) => {
    mutation.mutate({ questionId, questionType, chapterId });
  };

  return {
    markComplete,
    markCompleteAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
