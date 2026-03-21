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

      // Bulk insert sections
      const inserts = sections.map((s, i) => ({
        name: s.name,
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
      toast.success(`Extracted ${sections.length} sections from ${method}`);
      return sections.length;
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
