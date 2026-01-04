import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { extractVimeoId, extractYouTubeId, extractGoogleDriveId, normalizeVideoInput } from '@/lib/video';

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
  | 'essay' 
  | 'practical' 
  | 'osce' 
  | 'case_scenario' 
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
 * Extract video ID from a video URL (Vimeo, YouTube, or Google Drive)
 */
function extractVideoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const normalized = normalizeVideoInput(videoUrl);
  return extractVimeoId(normalized) || extractYouTubeId(normalized) || extractGoogleDriveId(normalized);
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
        // Legacy fields
        resourcesProgress: 0,
        resourcesCompleted: 0,
        resourcesTotal: 0,
        completedItems: 0,
        totalItems: 0,
      };

      if (!user?.id || !chapterId) {
        return emptyResult;
      }

      // Fetch all content items for this learning unit (chapter)
      const [
        lecturesRes,
        resourcesRes,
        mcqsRes,
        essaysRes,
        practicalsRes,
        caseScenariosRes,
        osceRes,
        matchingRes,
        userProgressRes,
        videoProgressRes,
      ] = await Promise.all([
        supabase.from('lectures').select('id, video_url').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('resources').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('mcqs').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('essays').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('practicals').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('case_scenarios').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('osce_questions').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('matching_questions').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('user_progress').select('content_id, content_type, completed').eq('user_id', user.id),
        supabase.from('video_progress').select('video_id, percent_watched, duration_seconds').eq('user_id', user.id),
      ]);

      // Count items by category
      const lectures = lecturesRes.data || [];
      const resourceIds = resourcesRes.data?.map(r => r.id) || [];
      const mcqIds = mcqsRes.data?.map(m => m.id) || [];
      const essayIds = essaysRes.data?.map(e => e.id) || [];
      const practicalIds = practicalsRes.data?.map(p => p.id) || [];
      const caseIds = caseScenariosRes.data?.map(c => c.id) || [];
      const osceIds = osceRes.data?.map(o => o.id) || [];
      const matchingIds = matchingRes.data?.map(m => m.id) || [];

      // Practice = all interactive items (MCQs, Essays, Practicals, Cases, OSCE, Matching)
      const allPracticeIds = [...mcqIds, ...essayIds, ...practicalIds, ...caseIds, ...osceIds, ...matchingIds];
      const practiceTotal = allPracticeIds.length;

      // Count completed practice items
      const completedContentIds = new Set(
        userProgressRes.data?.filter(p => p.completed).map(p => p.content_id) || []
      );
      const practiceCompleted = allPracticeIds.filter(id => completedContentIds.has(id)).length;
      const practiceProgress = practiceTotal > 0 ? Math.round((practiceCompleted / practiceTotal) * 100) : 0;

      // --- Video Progress Calculation ---
      // Extract video IDs from lectures that have video URLs
      const lectureVideos = lectures
        .filter(l => l.video_url)
        .map(l => ({
          lectureId: l.id,
          videoId: extractVideoId(l.video_url),
        }))
        .filter(v => v.videoId !== null) as Array<{ lectureId: string; videoId: string }>;

      const videosTotal = lectureVideos.length;

      // Build a map of video progress
      const videoProgressMap = new Map<string, { percent: number; duration: number | null }>();
      videoProgressRes.data?.forEach(vp => {
        videoProgressMap.set(vp.video_id, {
          percent: Number(vp.percent_watched) || 0,
          duration: vp.duration_seconds ? Number(vp.duration_seconds) : null,
        });
      });

      // Calculate video progress using duration-weighted average if durations available
      let videoProgress = 0;
      let videosCompleted = 0;

      if (videosTotal > 0) {
        let totalWatchedSeconds = 0;
        let totalDurationSeconds = 0;
        let hasAnyDuration = false;

        for (const { videoId } of lectureVideos) {
          const progress = videoProgressMap.get(videoId);
          const percent = progress?.percent || 0;
          const duration = progress?.duration || null;

          if (percent >= VIDEO_COMPLETION_THRESHOLD) {
            videosCompleted++;
          }

          if (duration && duration > 0) {
            hasAnyDuration = true;
            totalDurationSeconds += duration;
            // watchedSeconds = (percent / 100) * duration
            totalWatchedSeconds += (percent / 100) * duration;
          }
        }

        if (hasAnyDuration && totalDurationSeconds > 0) {
          // Duration-weighted video progress
          videoProgress = Math.round((totalWatchedSeconds / totalDurationSeconds) * 100);
        } else {
          // Fallback: simple average of percentages
          const sumPercent = lectureVideos.reduce((sum, { videoId }) => {
            const progress = videoProgressMap.get(videoId);
            return sum + (progress?.percent || 0);
          }, 0);
          videoProgress = Math.round(sumPercent / videosTotal);
        }

        // Cap at 100
        videoProgress = Math.min(100, videoProgress);
      }

      // --- Calculate Overall Weighted Progress ---
      let totalProgress: number;
      const hasPractice = practiceTotal > 0;
      const hasVideos = videosTotal > 0;

      if (hasPractice && hasVideos) {
        // Both present: weighted average
        totalProgress = Math.round(PRACTICE_WEIGHT * practiceProgress + VIDEO_WEIGHT * videoProgress);
      } else if (hasPractice) {
        // Only practice items, no videos: 100% practice
        totalProgress = practiceProgress;
      } else if (hasVideos) {
        // Only videos, no practice: 100% videos
        totalProgress = videoProgress;
      } else {
        // Neither
        totalProgress = 0;
      }

      // Legacy fields for backward compatibility
      const resourcesTotal = resourceIds.length + lectures.length;
      const resourcesCompleted = resourceIds.filter(id => completedContentIds.has(id)).length 
        + lectures.filter(l => completedContentIds.has(l.id)).length;
      const resourcesProgress = resourcesTotal > 0 ? Math.round((resourcesCompleted / resourcesTotal) * 100) : 0;

      return {
        totalProgress,
        practiceProgress,
        videoProgress,
        practiceCompleted,
        practiceTotal,
        videosCompleted,
        videosTotal,
        // Legacy fields
        resourcesProgress,
        resourcesCompleted,
        resourcesTotal,
        completedItems: practiceCompleted,
        totalItems: practiceTotal,
      };
    },
    enabled: !!chapterId && !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to mark an item as completed
 * 
 * Call this when:
 * - MCQ: After answer is submitted and feedback shown
 * - OSCE: After all T/F statements submitted
 * - Essay: When "Show Answer" clicked or "Mark as Done"
 * - Case Scenario: When full solution viewed
 * - Matching: When interaction completed
 */
export function useMarkItemComplete() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const markComplete = async (
    contentId: string, 
    contentType: TrackableContentType,
    chapterId?: string
  ) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        content_id: contentId,
        content_type: contentType,
        completed: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,content_type,content_id',
      });

    if (error) {
      console.error('Failed to mark item complete:', error);
      return;
    }

    // Invalidate progress queries to update UI immediately
    if (chapterId) {
      queryClient.invalidateQueries({ queryKey: ['chapter-progress', chapterId] });
    }
    // Also invalidate the general progress query
    queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
  };

  return { markComplete };
}

/**
 * Hook to check if a specific item is completed
 */
export function useItemCompletionStatus(contentId?: string, contentType?: TrackableContentType) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['item-completion', contentId, contentType, user?.id],
    queryFn: async () => {
      if (!user?.id || !contentId || !contentType) return false;

      const { data, error } = await supabase
        .from('user_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .maybeSingle();

      if (error) {
        console.error('Failed to check completion status:', error);
        return false;
      }

      return data?.completed ?? false;
    },
    enabled: !!contentId && !!contentType && !!user?.id,
    staleTime: 30000,
  });
}
