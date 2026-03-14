import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { extractYouTubeId } from '@/lib/video';

export interface VideoAnalyticsRow {
  lectureId: string;
  title: string;
  createdAt: string;
  totalViewers: number;
  avgCompletionRate: number;
  fullyWatchedCount: number;
  bookmarkedCount: number;
  thumbsUp: number;
  thumbsDown: number;
}

export function useVideoAnalytics() {
  const { isSuperAdmin, isPlatformAdmin, isModuleAdmin } = useAuthContext();
  const enabled = isSuperAdmin || isPlatformAdmin || isModuleAdmin;

  return useQuery({
    queryKey: ['video-analytics'],
    enabled,
    queryFn: async (): Promise<VideoAnalyticsRow[]> => {
      const [lecturesRes, progressRes, bookmarksRes, ratingsRes] = await Promise.all([
        supabase.from('lectures').select('id, title, video_url, created_at').eq('is_deleted', false),
        supabase.from('video_progress').select('video_id, user_id, percent_watched'),
        supabase.from('user_bookmarks').select('item_id, user_id').eq('item_type', 'video'),
        supabase.from('video_ratings').select('video_id, user_id, rating'),
      ]);

      const lectures = lecturesRes.data || [];
      const progress = progressRes.data || [];
      const bookmarks = bookmarksRes.data || [];
      const ratings = ratingsRes.data || [];

      // Index engagement data by YouTube video ID for O(n) lookup
      const progressByVideoId = new Map<string, typeof progress>();
      for (const p of progress) {
        const arr = progressByVideoId.get(p.video_id) || [];
        arr.push(p);
        progressByVideoId.set(p.video_id, arr);
      }

      const bookmarksByVideoId = new Map<string, typeof bookmarks>();
      for (const b of bookmarks) {
        const arr = bookmarksByVideoId.get(b.item_id) || [];
        arr.push(b);
        bookmarksByVideoId.set(b.item_id, arr);
      }

      const ratingsByVideoId = new Map<string, typeof ratings>();
      for (const r of ratings) {
        const arr = ratingsByVideoId.get(r.video_id) || [];
        arr.push(r);
        ratingsByVideoId.set(r.video_id, arr);
      }

      return lectures.map((lecture) => {
        const ytId = extractYouTubeId(lecture.video_url);
        const key = ytId || '';

        const lectureProgress = progressByVideoId.get(key) || [];
        const lectureBookmarks = bookmarksByVideoId.get(key) || [];
        const lectureRatings = ratingsByVideoId.get(key) || [];

        const uniqueViewers = new Set(lectureProgress.map(p => p.user_id));
        const uniqueBookmarkers = new Set(lectureBookmarks.map(b => b.user_id));

        const avgCompletion = lectureProgress.length > 0
          ? Math.round((lectureProgress.reduce((sum, p) => sum + (p.percent_watched || 0), 0) / lectureProgress.length) * 10) / 10
          : 0;

        return {
          lectureId: lecture.id,
          title: lecture.title,
          createdAt: lecture.created_at,
          totalViewers: uniqueViewers.size,
          avgCompletionRate: avgCompletion,
          fullyWatchedCount: lectureProgress.filter(p => (p.percent_watched || 0) >= 95).length,
          bookmarkedCount: uniqueBookmarkers.size,
          thumbsUp: lectureRatings.filter(r => r.rating === 1).length,
          thumbsDown: lectureRatings.filter(r => r.rating === -1).length,
        };
      });
    },
  });
}
