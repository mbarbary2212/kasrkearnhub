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
 * - Processes ALL YouTube lectures in the chapter (not just untagged ones)
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

      if (error) throw error;

      // Filter to only YouTube lectures
      const ytLectures = (lectures ?? []).filter((l) => {
        if (l.youtube_video_id) return true;
        const url = l.video_url ?? '';
        return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
      });

      if (ytLectures.length === 0) {
        toast.info('All YouTube lectures in this chapter already have sections assigned.');
        return;
      }

      setProgress(`Asking Gemini to analyze ${ytLectures.length} video${ytLectures.length > 1 ? 's' : ''}...`);

      // Build items payload — extract youtube_video_id if not stored explicitly
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

      const response = await supabase.functions.invoke('ai-auto-tag-sections', {
        body: {
          items,
          sections: sections.map((s) => ({ id: s.id, name: s.name, ilo: (s as any).ilo })),
          // Signal to the edge function that we want multiple sections per video
          multi_section: true,
        },
      });

      if (response.error) {
        const errorCode = (response.data as any)?.errorCode;
        if (errorCode === 'NO_GOOGLE_API_KEY') {
          toast.error('YouTube analysis requires a Google API key. Ask your platform admin to set GOOGLE_API_KEY in Supabase Edge Function secrets.');
        } else {
          throw new Error(response.error.message ?? 'Edge function error');
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
        if (validSectionIds.length === 0) continue;

        // Write to lecture_sections junction table
        // Delete existing then re-insert (same pattern as useSetLectureSections)
        await supabase.from('lecture_sections').delete().eq('lecture_id', item.id);

        if (validSectionIds.length > 0) {
          await supabase
            .from('lecture_sections')
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
      console.error('[AutoTagYouTube] Error:', err);
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
