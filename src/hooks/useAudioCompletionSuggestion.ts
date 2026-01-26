import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AudioSuggestion {
  type: 'next_audio' | 'practice_mcqs';
  audio?: { id: string; title: string };
  count?: number;
  sectionId?: string;
  chapterId?: string;
}

export function useAudioCompletionSuggestion() {
  const [suggestion, setSuggestion] = useState<AudioSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestion = useCallback(async (
    currentResourceId: string,
    sectionId?: string,
    chapterId?: string
  ): Promise<AudioSuggestion | null> => {
    setIsLoading(true);
    try {
      // 1. Try to find next audio in same section
      if (sectionId) {
        const { data: nextAudio } = await supabase
          .from('resources')
          .select('id, title')
          .eq('section_id', sectionId)
          .eq('resource_type', 'audio')
          .eq('is_deleted', false)
          .neq('id', currentResourceId)
          .order('display_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextAudio) {
          const result: AudioSuggestion = { type: 'next_audio', audio: nextAudio };
          setSuggestion(result);
          return result;
        }

        // 2. Check for MCQs in section
        const { count: sectionMcqs } = await supabase
          .from('mcqs')
          .select('*', { count: 'exact', head: true })
          .eq('section_id', sectionId)
          .eq('is_deleted', false);

        if (sectionMcqs && sectionMcqs > 0) {
          const result: AudioSuggestion = {
            type: 'practice_mcqs',
            count: Math.min(3, sectionMcqs),
            sectionId,
          };
          setSuggestion(result);
          return result;
        }
      }

      // 3. Fallback: MCQs in chapter
      if (chapterId) {
        const { count: chapterMcqs } = await supabase
          .from('mcqs')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('is_deleted', false);

        if (chapterMcqs && chapterMcqs > 0) {
          const result: AudioSuggestion = {
            type: 'practice_mcqs',
            count: Math.min(3, chapterMcqs),
            chapterId,
          };
          setSuggestion(result);
          return result;
        }
      }

      // No suggestion available
      setSuggestion(null);
      return null;
    } catch (error) {
      console.error('Error fetching audio completion suggestion:', error);
      setSuggestion(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  return {
    suggestion,
    isLoading,
    fetchSuggestion,
    clearSuggestion,
  };
}
