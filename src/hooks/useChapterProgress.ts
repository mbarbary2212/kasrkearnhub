import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { extractYouTubeId, extractGoogleDriveId, normalizeVideoInput } from '@/lib/video';

/**
 * Progress Tracking System
 * 
 * Uses a single RPC call (get_content_progress) instead of ~17 separate REST calls.
 * 
 * PROGRESS CALCULATION (Weighted):
 * - Practice Progress (60%): (Completed Practice Items / Total Practice Items) × 100
 * - Video Progress (40%): Duration-weighted average of watch percentages
 * - Overall Progress = 0.60 × Practice + 0.40 × Video
 */

const PRACTICE_WEIGHT = 0.60;
const VIDEO_WEIGHT = 0.40;
const VIDEO_COMPLETION_THRESHOLD = 80;

export type TrackableContentType = 
  | 'lecture' 
  | 'resource' 
  | 'mcq' 
  | 'true_false'
  | 'essay' 
  | 'practical' 
  | 'osce' 
  | 'case_scenario' 
  | 'matching';

interface ChapterProgressData {
  totalProgress: number;
  practiceProgress: number;
  videoProgress: number;
  practiceCompleted: number;
  practiceTotal: number;
  videosCompleted: number;
  videosTotal: number;
  resourcesProgress: number;
  resourcesCompleted: number;
  resourcesTotal: number;
  completedItems: number;
  totalItems: number;
  // Per-type breakdowns
  mcqCompleted: number;
  mcqTotal: number;
  essayCompleted: number;
  essayTotal: number;
  osceCompleted: number;
  osceTotal: number;
  caseCompleted: number;
  caseTotal: number;
  matchingCompleted: number;
  matchingTotal: number;
  tfCompleted: number;
  tfTotal: number;
}

function extractVideoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const normalized = normalizeVideoInput(videoUrl);
  return extractYouTubeId(normalized) || extractGoogleDriveId(normalized);
}

interface RpcProgressResult {
  mcq_total: number;
  essay_total: number;
  osce_total: number;
  case_total: number;
  matching_total: number;
  tf_total: number;
  mcq_completed: number;
  essay_completed: number;
  osce_completed: number;
  case_completed: number;
  matching_completed: number;
  tf_completed: number;
  lectures: { video_url: string | null }[];
  video_progress: { video_id: string; percent_watched: number }[];
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
        mcqCompleted: 0, mcqTotal: 0,
        essayCompleted: 0, essayTotal: 0,
        osceCompleted: 0, osceTotal: 0,
        caseCompleted: 0, caseTotal: 0,
        matchingCompleted: 0, matchingTotal: 0,
        tfCompleted: 0, tfTotal: 0,
      };

      if (!user?.id || !chapterId) return emptyResult;

      // Single RPC call replaces ~17 separate REST calls
      const { data, error } = await supabase.rpc('get_content_progress', {
        p_chapter_id: chapterId,
        p_topic_id: null,
        p_user_id: user.id,
      });

      if (error || !data) return emptyResult;

      const rpc = data as unknown as RpcProgressResult;

      // Practice totals
      const practiceTotal = rpc.mcq_total + rpc.essay_total + rpc.osce_total + rpc.case_total + rpc.matching_total + rpc.tf_total;
      const practiceCompleted = rpc.mcq_completed + rpc.essay_completed + rpc.osce_completed + rpc.case_completed + rpc.matching_completed + rpc.tf_completed;

      // Video progress (client-side matching since video_id is extracted via regex)
      const videoProgressMap = new Map(
        (rpc.video_progress || []).map(vp => [vp.video_id, vp.percent_watched])
      );

      let videosTotal = 0;
      let videosCompleted = 0;
      let totalVideoProgress = 0;

      for (const lecture of rpc.lectures || []) {
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

      // Weighted total
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
        resourcesProgress: videoProgress,
        resourcesCompleted: videosCompleted,
        resourcesTotal: videosTotal,
        completedItems: practiceCompleted + videosCompleted,
        totalItems: practiceTotal + videosTotal,
        mcqCompleted: rpc.mcq_completed,
        mcqTotal: rpc.mcq_total,
        essayCompleted: rpc.essay_completed,
        essayTotal: rpc.essay_total,
        osceCompleted: rpc.osce_completed,
        osceTotal: rpc.osce_total,
        caseCompleted: rpc.case_completed,
        caseTotal: rpc.case_total,
        matchingCompleted: rpc.matching_completed,
        matchingTotal: rpc.matching_total,
        tfCompleted: rpc.tf_completed,
        tfTotal: rpc.tf_total,
      };
    },
    enabled: !!user?.id && !!chapterId,
    staleTime: 30000,
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
      questionType: 'mcq' | 'true_false' | 'essay' | 'osce' | 'case_scenario' | 'matching';
      chapterId?: string;
      isCorrect?: boolean;
      selectedAnswer?: unknown;
    }) => {
      // Attempt saving is now handled by useSaveQuestionAttempt via RPC.
      // This hook is retained for backward compatibility but no longer writes to the DB.
      return { questionId, chapterId: chapterId || '' };
    },
    onSuccess: ({ chapterId }) => {
      if (chapterId) {
        invalidateChapter(chapterId);
      }
    },
  });

  const markComplete = (
    questionId: string,
    questionType: 'mcq' | 'true_false' | 'essay' | 'osce' | 'case_scenario' | 'matching',
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
