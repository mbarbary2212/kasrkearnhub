import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Youtube, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChapterSections, useChapterSectionsEnabled } from '@/hooks/useSections';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AutoTagYouTubeButtonProps {
  chapterId: string;
  lectures?: any[];
}

/**
 * Admin-only button that uses Gemini to watch each YouTube lecture in this chapter
 * and automatically assigns it to one or more of the chapter's EXISTING sections.
 * 
 * v180: Sequential processing to prevent 504 Timeouts.
 */
export function AutoTagYouTubeButton({ chapterId, lectures: propsLectures }: AutoTagYouTubeButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const queryClient = useQueryClient();

  const { data: sectionsEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: sections } = useChapterSections(chapterId);

  if (!sectionsEnabled || !sections?.length) return null;

  const handleAssign = async () => {
    setIsRunning(true);
    setProgress('Finding YouTube lectures...');

    try {
      let activeLectures = propsLectures;

      // If no lectures passed in, fetch them all for this chapter
      if (!activeLectures) {
        const { data, error } = await supabase
          .from('lectures')
          .select('id, title, video_url, youtube_video_id, section_id')
          .eq('chapter_id', chapterId)
          .eq('is_deleted', false);
        
        if (error) throw error;
        activeLectures = data || [];
      }

      console.log(`[AutoTagYouTube] Considering ${activeLectures.length} total lectures in UI state...`);

      // 2. Filter to only YouTube
      const ytItems = activeLectures.filter((l) => {
        const url = l.video_url || l.videoUrl || '';
        return l.youtube_video_id || /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
      }).map(l => {
        const url = l.video_url || l.videoUrl || '';
        const ytId = l.youtube_video_id || url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        return { id: l.id, title: l.title, youtube_video_id: ytId };
      }).filter(l => l.youtube_video_id);

      if (ytItems.length === 0) {
        toast.info('No untagged YouTube lectures found in this chapter.');
        return;
      }

      console.log(`[AutoTagYouTube] Starting sequential analysis of ${ytItems.length} videos...`);
      let assignedCount = 0;

      // 3. Process ONE BY ONE to prevent 504 timeouts
      for (let i = 0; i < ytItems.length; i++) {
        const item = ytItems[i];
        setProgress(`Analyzing (${i + 1}/${ytItems.length}): ${item.title}...`);

        const { data, error: invokeError } = await supabase.functions.invoke('ai-auto-tag-sections', {
          body: { 
            items: [ { id: item.id, content: item.title, youtube_video_id: item.youtube_video_id } ],
            sections: sections.map(s => ({ id: s.id, name: s.name }))
          }
        });

        if (invokeError) {
          console.error(`[AutoTagYouTube] Error on ${item.title}:`, invokeError);
          continue;
        }

        const assignments = data?.assignments || {};
        const res = assignments[item.id];
        
        if (res && res.section_ids?.length > 0) {
          const validIds = res.section_ids.filter((sid: string) => sections.some(s => s.id === sid));
          
          if (validIds.length > 0) {
            console.log(`[AutoTagYouTube] Assigning ${item.title} ->`, validIds);
            
            // Sync Junction Table
            await (supabase.from as any)('lecture_sections').delete().eq('lecture_id', item.id);
            await (supabase.from as any)('lecture_sections').insert(
              validIds.map((sid: string) => ({ lecture_id: item.id, section_id: sid }))
            );
            
            // Sync Legacy Column
            await supabase.from('lectures').update({ section_id: validIds[0] } as never).eq('id', item.id);
            assignedCount++;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: [['lectures', chapterId]] });
      
      if (assignedCount > 0) {
        toast.success(`Successfully tagged ${assignedCount} video${assignedCount > 1 ? 's' : ''}.`);
      } else {
        toast.warning('Gemini was unable to match these videos to any sections.');
      }

    } catch (err: any) {
      console.error('[AutoTagYouTube] Fatal error:', err);
      toast.error(`Automated tagging failed: ${err.message || 'Unknown error'}`);
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
      id="auto-tag-youtube-btn"
    >
      {isRunning ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="hidden sm:inline">{progress || 'Analyzing...'}</span>
          <span className="sm:hidden">...</span>
        </>
      ) : (
        <>
          <Youtube className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Auto-Tag YouTube</span>
        </>
      )}
    </Button>
  );
}
