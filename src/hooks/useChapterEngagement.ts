import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { extractYouTubeId, extractGoogleDriveId, normalizeVideoInput } from '@/lib/video';
import {
  calculateEngagement,
  mapRpcToEngagementData,
  type EngagementResult,
} from '@/lib/readiness/engagement';
import { MEANINGFUL_THRESHOLDS } from '@/lib/readiness/config';

/**
 * Hook to compute multi-source engagement for a chapter.
 * 
 * Uses the same get_content_progress RPC as useChapterProgress,
 * but feeds data into the unified engagement calculator.
 */

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
  pathway_total: number;
  pathway_viewed: number;
  flashcard_total: number;
  flashcard_reviewed: number;
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

const EMPTY_RESULT: EngagementResult = {
  engagementPercent: 0,
  sourceBreakdown: [],
  missingTracking: [],
  sourcesWithContent: 0,
  totalSources: 5,
};

export function useChapterEngagement(chapterId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['chapter-engagement', chapterId, user?.id],
    queryFn: async (): Promise<EngagementResult> => {
      if (!user?.id || !chapterId) return EMPTY_RESULT;

      const { data, error } = await supabase.rpc('get_content_progress', {
        p_chapter_id: chapterId,
        p_topic_id: null,
        p_user_id: user.id,
      });

      if (error || !data) return EMPTY_RESULT;
      const rpc = data as unknown as RpcProgressResult;

      // Count videos using meaningful threshold
      const videoProgressMap = new Map(
        (rpc.video_progress || []).map(vp => [vp.video_id, vp.percent_watched])
      );

      let videosTotal = 0;
      let videosCompleted = 0;
      for (const lecture of rpc.lectures || []) {
        const videoId = extractVideoId(lecture.video_url);
        if (videoId) {
          videosTotal++;
          const pct = videoProgressMap.get(videoId) || 0;
          if (pct >= MEANINGFUL_THRESHOLDS.videoWatchPercent) {
            videosCompleted++;
          }
        }
      }

      const engagementData = mapRpcToEngagementData({
        videosCompleted,
        videosTotal,
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
        flashcardReviewed: rpc.flashcard_reviewed,
        flashcardTotal: rpc.flashcard_total,
        mindMapViewed: rpc.mind_map_viewed,
        mindMapTotal: rpc.mind_map_total,
        guidedViewed: rpc.guided_viewed,
        guidedTotal: rpc.guided_total,
        referenceViewed: rpc.reference_viewed,
        referenceTotal: rpc.reference_total,
        clinicalToolViewed: rpc.clinical_tool_viewed,
        clinicalToolTotal: rpc.clinical_tool_total,
        pathwayViewed: rpc.pathway_viewed,
        pathwayTotal: rpc.pathway_total,
      });

      return calculateEngagement(engagementData);
    },
    enabled: !!user?.id && !!chapterId,
    staleTime: 30_000,
  });
}
