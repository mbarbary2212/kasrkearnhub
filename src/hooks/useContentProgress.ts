import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { extractYouTubeId, extractGoogleDriveId, normalizeVideoInput } from '@/lib/video';
import { calculateChapterProgress, type ChapterProgressInput } from '@/lib/progress/calculateChapterProgress';

/**
 * Unified Content Progress Hook
 * 
 * Uses a single RPC call (get_content_progress) instead of ~17 separate REST calls.
 * Supports both chapter-based and topic-based modules with identical progress calculation.
 * CRITICAL: chapterId and topicId are mutually exclusive - never pass both.
 */

const PRACTICE_WEIGHT = 0.60;
const VIDEO_WEIGHT = 0.40;
const VIDEO_COMPLETION_THRESHOLD = 80;

interface ContentProgressData {
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
  /** Chapter readiness status from the centralised calculator */
  status?: string;
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
  mind_map_total: number;
  mind_map_viewed: number;
  guided_total: number;
  guided_viewed: number;
  reference_total: number;
  reference_viewed: number;
  clinical_tool_total: number;
  clinical_tool_viewed: number;
  lectures: { video_url: string | null }[];
  video_progress: { video_id: string; percent_watched: number }[];
}

function extractVideoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const normalized = normalizeVideoInput(videoUrl);
  return extractYouTubeId(normalized) || extractGoogleDriveId(normalized);
}

export interface ContentProgressParams {
  chapterId?: string;
  topicId?: string;
}

/**
 * Unified progress hook that works for both chapters and topics
 */
export function useContentProgress({ chapterId, topicId }: ContentProgressParams) {
  const { user } = useAuthContext();
  
  const containerColumn = chapterId ? 'chapter_id' : 'topic_id';
  const containerId = chapterId || topicId;

  return useQuery({
    queryKey: ['content-progress', containerColumn, containerId, user?.id],
    queryFn: async (): Promise<ContentProgressData> => {
      const emptyResult: ContentProgressData = {
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

      if (!user?.id || !containerId) return emptyResult;

      // Single RPC call replaces ~17 separate REST calls
      const { data, error } = await supabase.rpc('get_content_progress', {
        p_chapter_id: chapterId || null,
        p_topic_id: topicId || null,
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

      // Build input for the centralised calculator
      const progressInput: ChapterProgressInput = {
        chapterId: containerId!,
        videosWatched: videosCompleted,
        totalVideos: videosTotal,
        textsRead: 0,
        totalTexts: 0,
        flashcardsReviewed: 0,
        totalFlashcardSessions: 0,
        practiceSessions: practiceCompleted,
        totalPracticeSessions: practiceTotal,
        mcqAttempts: rpc.mcq_completed,
        mcqCorrect: rpc.mcq_completed,
        osceAttempts: rpc.osce_completed,
        osceAvgScore: rpc.osce_completed > 0 ? 3 : 0,
        reviewSessionsCompleted: 0,
        reviewSessionsScheduled: 0,
        daysSinceLastActivity: null,
        studyDaysInLast14: 0,
        socratesCompleted: 0,
        socratesTotal: 0,
      };

      const readinessResult = calculateChapterProgress(progressInput);
      const totalProgress = readinessResult.readiness;

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
        status: readinessResult.status,
      };
    },
    enabled: !!user?.id && !!containerId,
    staleTime: 30000,
  });
}

/**
 * Hook to invalidate content progress
 */
export function useInvalidateContentProgress() {
  const queryClient = useQueryClient();

  return {
    invalidateChapter: (chapterId: string) => {
      queryClient.invalidateQueries({ queryKey: ['content-progress', 'chapter_id', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress', chapterId] });
    },
    invalidateTopic: (topicId: string) => {
      queryClient.invalidateQueries({ queryKey: ['content-progress', 'topic_id', topicId] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['content-progress'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
    },
  };
}
