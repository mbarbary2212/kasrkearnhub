import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Youtube, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChapterSections, useChapterSectionsEnabled } from '@/hooks/useSections';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AutoTagYouTubeButtonProps {
  chapterId: string;
}

/**
 * Admin-only button that uses Gemini to watch each YouTube lecture in this chapter
 * and automatically assigns it to one or more of the chapter's EXISTING sections.
 *
 * - Only processes lectures with no section assigned yet
 * - A video can be assigned to MULTIPLE sections
 * - Uses the lecture_sections junction table (same as manual section assignment)
 * - Never creates new sections — only assigns from existing ones
 */
export function AutoTagYouTubeButton({ chapterId }: AutoTagYouTubeButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const queryClient = useQueryClient();

  const { data: sectionsEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: sections } = useChapterSections(chapterId);

  // Only show if sections are enabled and at least one section exists
  if (!sectionsEnabled || !sections?.length) return null;

  const handleAssign = async () => {
    setIsRunning(true);
    setProgress('Fetching YouTube lectures...');

    try {
      // Fetch only untagged YouTube lectures (those with no section assigned yet)
      const { data: lectures, error } = await supabase
        .from('lectures')
        .select('id, title, video_url, youtube_video_id')
        .eq('chapter_id', chapterId)
        .is('section_id', null);

      if (error) {
        console.error('[AutoTagYouTube] DB query error:', error);
        throw error;
      }

      console.log('[AutoTagYouTube] Found lectures:', lectures?.length, lectures?.map(l => ({ id: l.id, title: l.title, yt: l.youtube_video_id, url: l.video_url?.substring(0, 50) })));

      // Filter to only YouTube lectures (those with a video ID or a YouTube URL)
      const ytLectures = (lectures ?? []).filter((l) => {
        if (l.youtube_video_id) return true;
        const url = l.video_url ?? '';
        return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
      });

      console.log('[AutoTagYouTube] YouTube lectures after filter:', ytLectures.length);

      if (ytLectures.length === 0) {
        toast.info('All YouTube lectures in this chapter already have sections assigned.');
        return;
      }

      setProgress(`Asking Gemini to analyze ${ytLectures.length} video${ytLectures.length > 1 ? 's' : ''}...`);

      // Build items payload — extract youtube_video_id from URL if not stored explicitly
      const items = ytLectures.map((l) => {
        const ytId =
          l.youtube_video_id ||
          (l.video_url ?? '').match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
          )?.[1] ||
          null;
        return {
          id: l.id,
          content: l.title ?? '',
          table: 'lectures',
          ...(ytId ? { youtube_video_id: ytId } : {}),
        };
      });

      console.log('[AutoTagYouTube] Sending items to edge function:', items.length, items.map(i => ({ id: i.id, yt: (i as any).youtube_video_id })));
      console.log('[AutoTagYouTube] Sections:', sections.map(s => ({ id: s.id, name: s.name })));

      const response = await supabase.functions.invoke('ai-auto-tag-sections', {
        body: {
          items,
          sections: sections.map((s) => ({ id: s.id, name: s.name, ilo: (s as any).ilo })),
          multi_section: true,
        },
      });

      console.log('[AutoTagYouTube] Edge function response:', { error: response.error, data: response.data });
      console.log('[AutoTagYouTube] Debug info:', response.data?.debug);

      if (response.error) {
        // When Supabase returns non-2xx, response.data may still contain our JSON body
        const errorData = response.data;
        const errorCode = errorData?.errorCode;
        console.error('[AutoTagYouTube] Edge function error:', response.error, 'errorCode:', errorCode, 'data:', errorData);

        if (errorCode === 'NO_GOOGLE_API_KEY') {
          toast.error('YouTube analysis requires a Google API key. Set GOOGLE_API_KEY in Supabase Edge Function secrets.');
        } else {
          toast.error(`AI auto-tag failed: ${errorData?.error || response.error?.message || 'Unknown error'}`);
        }
        return;
      }

      // assignments can be:
      //   { lectureId: { section_ids: [...], confidence: "high" } }   (multi-section mode)
      //   { lectureId: { section_id: "...", confidence: "high" } }    (single-section fallback)
      const assignments: Record<
        string,
        | { section_ids?: string[]; section_id?: string; confidence?: string }
        | string
        | null
      > = response.data?.assignments ?? {};

      console.log('[AutoTagYouTube] Assignments received:', assignments);

      let assigned = 0;

      for (const item of items) {
        const val = assignments[item.id];
        if (!val) continue;

        // Resolve section IDs (support both multi and single-section responses)
        let sectionIds: string[] = [];
        if (typeof val === 'string') {
          sectionIds = [val];
        } else if (val && typeof val === 'object') {
          const v = val as { section_ids?: string[]; section_id?: string };
          if (Array.isArray(v.section_ids) && v.section_ids.length > 0) {
            sectionIds = v.section_ids;
          } else if (v.section_id) {
            sectionIds = [v.section_id];
          }
        }

        // Validate all returned section IDs actually belong to this chapter
        const validSectionIds = sectionIds.filter((sid) =>
          sections.some((s) => s.id === sid)
        );
        if (validSectionIds.length === 0) {
          console.warn(`[AutoTagYouTube] No valid section IDs for lecture ${item.id}. Returned:`, sectionIds);
          continue;
        }

        console.log(`[AutoTagYouTube] Assigning lecture ${item.id} -> sections:`, validSectionIds);

        // Write to lecture_sections junction table
        // Delete existing then re-insert (same pattern as useSetLectureSections)
        await (supabase.from as any)('lecture_sections').delete().eq('lecture_id', item.id);

        if (validSectionIds.length > 0) {
          await (supabase.from as any)('lecture_sections')
            .insert(validSectionIds.map((section_id) => ({ lecture_id: item.id, section_id })));
        }

        // Keep lectures.section_id in sync with the first assigned section (for sorting/filtering)
        await supabase
          .from('lectures')
          .update({ section_id: validSectionIds[0] } as never)
          .eq('id', item.id);

        assigned++;
      }

      queryClient.invalidateQueries({ predicate: () => true });

      if (assigned === 0) {
        toast.warning(
          `Gemini analyzed ${ytLectures.length} video${ytLectures.length > 1 ? 's' : ''} but couldn't match them to your sections. Check that section names relate to the video topics.`
        );
      } else {
        toast.success(
          `Gemini assigned ${assigned} of ${ytLectures.length} YouTube lecture${ytLectures.length > 1 ? 's' : ''} to sections.`
        );
      }
    } catch (err) {
      console.error('[AutoTagYouTube] Uncaught error:', err);
      toast.error('Could not reach the AI service. Check the browser console for details.');
    } finally {
      setIsRunning(false);
      setProgress('');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAssign}
      disabled={isRunning}
      className="h-7 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
      title="Use Gemini to watch each YouTube video and assign it to existing sections (supports multiple sections per video)"
      id="auto-tag-youtube-btn"
    >
      {isRunning ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="hidden sm:inline">{progress || 'Analyzing videos...'}</span>
          <span className="sm:hidden">...</span>
        </>
      ) : (
        <>
          <Youtube className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Assign YouTube</span>
        </>
      )}
    </Button>
  );
}
