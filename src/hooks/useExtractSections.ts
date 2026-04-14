import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ExtractedSection {
  section_number: string;
  name: string;
}

export function useExtractSections() {
  const [isExtracting, setIsExtracting] = useState(false);
  const queryClient = useQueryClient();

  const extractAndInsert = async (chapterId: string): Promise<number> => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-pdf-sections', {
        body: { chapter_id: chapterId },
      });

      if (error) throw error;

      const sections: ExtractedSection[] = data?.sections || [];
      
      if (sections.length === 0) {
        const msg = data?.message || 'No sections could be extracted from the PDF';
        toast.info(msg);
        return 0;
      }

      // Fetch existing section names to filter out duplicates
      const { data: existingSections } = await supabase
        .from('sections')
        .select('name')
        .eq('chapter_id', chapterId);
      
      const existingNames = new Set(
        (existingSections || []).map((s: { name: string }) => s.name.trim().toLowerCase())
      );

      const newSections = sections.filter(
        (s) => !existingNames.has(s.name.trim().toLowerCase())
      );

      if (newSections.length === 0) {
        toast.info('All extracted sections already exist in this chapter');
        return 0;
      }

      // Bulk insert only new sections
      const inserts = newSections.map((s, i) => ({
        name: s.name.trim(),
        section_number: s.section_number || null,
        chapter_id: chapterId,
        display_order: i,
      }));

      const { error: insertError } = await supabase
        .from('sections')
        .insert(inserts);

      if (insertError) throw insertError;

      // Invalidate section queries
      queryClient.invalidateQueries({ queryKey: ['sections', 'chapter', chapterId] });

      const method = data?.method === 'ai' ? 'AI' : 'PDF structure';
      const skipped = sections.length - newSections.length;
      const skippedMsg = skipped > 0 ? ` (${skipped} duplicates skipped)` : '';
      toast.success(`Extracted ${newSections.length} sections from ${method}${skippedMsg}`);
      return newSections.length;
    } catch (err) {
      console.error('Section extraction failed:', err);
      toast.error('Failed to extract sections from PDF');
      return 0;
    } finally {
      setIsExtracting(false);
    }
  };

  return { extractAndInsert, isExtracting };
}
