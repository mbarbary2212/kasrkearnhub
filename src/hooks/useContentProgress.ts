import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { extractYouTubeId, extractGoogleDriveId, normalizeVideoInput, isVimeoUrl } from '@/lib/video';

/**
 * Unified Content Progress Hook
 * 
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
  // Legacy compatibility
  resourcesProgress: number;
  resourcesCompleted: number;
  resourcesTotal: number;
  completedItems: number;
  totalItems: number;
}

function extractVideoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  if (isVimeoUrl(videoUrl)) return null;
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
  
  // Determine which column to filter by
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

      // Fetch content counts - use explicit queries instead of dynamic function
      const mcqsQuery = chapterId 
        ? supabase.from('mcqs').select('id', { count: 'exact', head: true }).eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('mcqs').select('id', { count: 'exact', head: true }).eq('topic_id', topicId!).eq('is_deleted', false);

      const essaysQuery = chapterId
        ? supabase.from('essays').select('id', { count: 'exact', head: true }).eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('essays').select('id', { count: 'exact', head: true }).eq('topic_id', topicId!).eq('is_deleted', false);

      const oscesQuery = chapterId
        ? supabase.from('osce_questions').select('id', { count: 'exact', head: true }).eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('osce_questions').select('id', { count: 'exact', head: true }).eq('topic_id', topicId!).eq('is_deleted', false);

      const matchingQuery = chapterId
        ? supabase.from('matching_questions').select('id', { count: 'exact', head: true }).eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('matching_questions').select('id', { count: 'exact', head: true }).eq('topic_id', topicId!).eq('is_deleted', false);

      const lecturesQuery = chapterId
        ? supabase.from('lectures').select('id, video_url').eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('lectures').select('id, video_url').eq('topic_id', topicId!).eq('is_deleted', false);

      const [
        mcqsRes,
        essaysRes,
        oscesRes,
        matchingRes,
        lecturesRes,
      ] = await Promise.all([
        mcqsQuery,
        essaysQuery,
        oscesQuery,
        matchingQuery,
        lecturesQuery,
      ]);

      // Fetch question IDs for each type to check attempts
      const mcqIdsQuery = chapterId
        ? supabase.from('mcqs').select('id').eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('mcqs').select('id').eq('topic_id', topicId!).eq('is_deleted', false);

      const essayIdsQuery = chapterId
        ? supabase.from('essays').select('id').eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('essays').select('id').eq('topic_id', topicId!).eq('is_deleted', false);

      const osceIdsQuery = chapterId
        ? supabase.from('osce_questions').select('id').eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('osce_questions').select('id').eq('topic_id', topicId!).eq('is_deleted', false);

      const matchingIdsQuery = chapterId
        ? supabase.from('matching_questions').select('id').eq('chapter_id', chapterId).eq('is_deleted', false)
        : supabase.from('matching_questions').select('id').eq('topic_id', topicId!).eq('is_deleted', false);

      const [mcqIds, essayIds, osceIds, matchingIds] = await Promise.all([
        mcqIdsQuery,
        essayIdsQuery,
        osceIdsQuery,
        matchingIdsQuery,
      ]);

      // Fetch user attempts
      const [
        mcqAttempts,
        essayAttempts,
        osceAttempts,
        matchingAttempts,
        videoProgressRes,
      ] = await Promise.all([
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'mcq')
          .in('question_id', mcqIds.data?.map(m => m.id) || []),
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'mcq')
          .in('question_id', essayIds.data?.map(e => e.id) || []),
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'osce')
          .in('question_id', osceIds.data?.map(o => o.id) || []),
        supabase
          .from('question_attempts')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'mcq')
          .in('question_id', matchingIds.data?.map(m => m.id) || []),
        supabase
          .from('video_progress')
          .select('video_id, percent_watched')
          .eq('user_id', user.id),
      ]);

      // Calculate totals
      const mcqTotal = mcqsRes.count || 0;
      const essayTotal = essaysRes.count || 0;
      const osceTotal = oscesRes.count || 0;
      const matchingTotal = matchingRes.count || 0;
      const practiceTotal = mcqTotal + essayTotal + osceTotal + matchingTotal;

      // Calculate completed (unique items)
      const mcqCompleted = new Set(mcqAttempts.data?.map(a => a.question_id) || []).size;
      const essayCompleted = new Set(essayAttempts.data?.map(a => a.question_id) || []).size;
      const osceCompleted = new Set(osceAttempts.data?.map(a => a.question_id) || []).size;
      const matchingCompleted = new Set(matchingAttempts.data?.map(a => a.question_id) || []).size;
      const practiceCompleted = mcqCompleted + essayCompleted + osceCompleted + matchingCompleted;

      // Video progress
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
      // Also invalidate legacy key
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
