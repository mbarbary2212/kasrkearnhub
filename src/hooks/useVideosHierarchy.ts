import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractYouTubeId } from '@/lib/video';

export interface LectureNode {
  id: string;
  title: string;
  video_url: string | null;
  youtube_video_id: string | null;
  duration: string | null;
  view_count: number;
}

export interface ChapterNode {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  lectures: LectureNode[];
  total_videos: number;
  total_views: number;
}

export interface ModuleNode {
  id: string;
  year_id: string;
  name: string;
  display_order: number;
  youtube_playlist_id: string | null;
  chapters: ChapterNode[];
  total_videos: number;
  total_views: number;
}

export interface YearNode {
  id: string;
  name: string;
  modules: ModuleNode[];
  total_videos: number;
  total_views: number;
}

async function fetchVideosHierarchy(): Promise<YearNode[]> {
  const [yearsRes, modulesRes, chaptersRes, lecturesRes, viewCountsRes] = await Promise.all([
    supabase.from('years').select('id, name').order('name'),
    supabase.from('modules').select('id, year_id, name, display_order, youtube_playlist_id').order('display_order'),
    supabase.from('module_chapters').select('id, module_id, title, order_index').order('order_index'),
    supabase.from('lectures').select('id, chapter_id, title, video_url, youtube_video_id, duration').eq('is_deleted', false),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('video_view_counts').select('video_id, unique_viewers'),
  ]);

  const years = yearsRes.data || [];
  const modules = modulesRes.data || [];
  const chapters = chaptersRes.data || [];
  const lectures = lecturesRes.data || [];
  const viewCounts = viewCountsRes.data || [];

  // Build view count map: youtube_video_id -> unique_viewers
  const viewCountMap = new Map<string, number>();
  for (const vc of viewCounts) {
    viewCountMap.set(vc.video_id, Number(vc.unique_viewers) || 0);
  }

  // Build lecture nodes indexed by chapter_id
  const lecturesByChapter = new Map<string, LectureNode[]>();
  for (const lecture of lectures) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = lecture as any;
    const ytId: string | null = raw.youtube_video_id || extractYouTubeId(lecture.video_url) || null;
    const node: LectureNode = {
      id: lecture.id,
      title: lecture.title,
      video_url: lecture.video_url ?? null,
      youtube_video_id: ytId,
      duration: (raw.duration as string | null) ?? null,
      view_count: ytId ? (viewCountMap.get(ytId) ?? 0) : 0,
    };
    const list = lecturesByChapter.get(lecture.chapter_id) || [];
    list.push(node);
    lecturesByChapter.set(lecture.chapter_id, list);
  }

  // Build chapter nodes indexed by module_id
  const chaptersByModule = new Map<string, ChapterNode[]>();
  for (const chapter of chapters) {
    const chapterLectures = lecturesByChapter.get(chapter.id) || [];
    const total_videos = chapterLectures.length;
    const total_views = chapterLectures.reduce((sum, l) => sum + l.view_count, 0);
    const node: ChapterNode = {
      id: chapter.id,
      module_id: chapter.module_id,
      title: chapter.title,
      order_index: chapter.order_index,
      lectures: chapterLectures,
      total_videos,
      total_views,
    };
    const list = chaptersByModule.get(chapter.module_id) || [];
    list.push(node);
    chaptersByModule.set(chapter.module_id, list);
  }

  // Build module nodes indexed by year_id
  const modulesByYear = new Map<string, ModuleNode[]>();
  for (const module of modules) {
    const moduleChapters = chaptersByModule.get(module.id) || [];
    const total_videos = moduleChapters.reduce((sum, c) => sum + c.total_videos, 0);
    const total_views = moduleChapters.reduce((sum, c) => sum + c.total_views, 0);
    const node: ModuleNode = {
      id: module.id,
      year_id: module.year_id,
      name: module.name,
      display_order: module.display_order,
      youtube_playlist_id: (module as { youtube_playlist_id?: string | null }).youtube_playlist_id ?? null,
      chapters: moduleChapters,
      total_videos,
      total_views,
    };
    const list = modulesByYear.get(module.year_id) || [];
    list.push(node);
    modulesByYear.set(module.year_id, list);
  }

  // Build year nodes
  return years.map((year) => {
    const yearModules = modulesByYear.get(year.id) || [];
    const total_videos = yearModules.reduce((sum, m) => sum + m.total_videos, 0);
    const total_views = yearModules.reduce((sum, m) => sum + m.total_views, 0);
    return {
      id: year.id,
      name: year.name,
      modules: yearModules,
      total_videos,
      total_views,
    };
  });
}

export function useVideosHierarchy() {
  return useQuery({
    queryKey: ['videos-hierarchy'],
    queryFn: fetchVideosHierarchy,
  });
}
