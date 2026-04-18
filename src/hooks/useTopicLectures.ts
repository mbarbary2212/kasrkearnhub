import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopicLecture {
  id: string;
  title: string;
  description: string | null; // doctor name
  video_url: string | null;
  youtube_video_id: string | null;
  duration: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  chapter_title?: string | null;
}

export interface TopicLectureGroup {
  doctor: string;
  lectures: TopicLecture[];
}

export interface UseTopicLecturesResult {
  topicName: string | null;
  total: number;
  groups: TopicLectureGroup[];
}

/**
 * Fetch all lectures sharing a topic_id, grouped by doctor (lecture.description).
 */
export function useTopicLectures(topicId: string | null | undefined) {
  return useQuery<UseTopicLecturesResult>({
    queryKey: ['topic-lectures', topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { data: lectureRows, error } = await supabase
        .from('lectures')
        .select(
          'id, title, description, video_url, youtube_video_id, duration, chapter_id, topic_id'
        )
        .eq('topic_id', topicId!)
        .eq('is_deleted', false)
        .order('description', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      const lectures = (lectureRows || []) as TopicLecture[];

      // Pull topic name + chapter titles in parallel
      const chapterIds = Array.from(
        new Set(lectures.map((l) => l.chapter_id).filter(Boolean) as string[])
      );

      const [{ data: topicRow }, { data: chapterRows }] = await Promise.all([
        supabase.from('topics').select('name').eq('id', topicId!).maybeSingle(),
        chapterIds.length > 0
          ? supabase.from('module_chapters').select('id, title').in('id', chapterIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      ]);

      const chapterMap = new Map(
        (chapterRows || []).map((c) => [c.id, c.title] as const)
      );

      const enriched = lectures.map((l) => ({
        ...l,
        chapter_title: l.chapter_id ? chapterMap.get(l.chapter_id) ?? null : null,
      }));

      // Group by doctor
      const groupMap = new Map<string, TopicLecture[]>();
      for (const l of enriched) {
        const doctor = (l.description || 'Unknown').trim() || 'Unknown';
        if (!groupMap.has(doctor)) groupMap.set(doctor, []);
        groupMap.get(doctor)!.push(l);
      }

      const groups: TopicLectureGroup[] = Array.from(groupMap.entries())
        .map(([doctor, lectures]) => ({ doctor, lectures }))
        .sort((a, b) => a.doctor.localeCompare(b.doctor));

      return {
        topicName: topicRow?.name ?? null,
        total: enriched.length,
        groups,
      };
    },
  });
}
