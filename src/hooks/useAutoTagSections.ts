import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Section } from '@/hooks/useSections';
import { useQueryClient } from '@tanstack/react-query';

// All content tables that have section_id + original_section_name/number
const CONTENT_TABLES = [
  'lectures',
  'resources',
  'study_resources',
  'mcqs',
  'mcq_sets',
  'essays',
  'practicals',
  'osce_questions',
  'matching_questions',
  'true_false_questions',
  'virtual_patient_cases',
] as const;

type ContentTable = typeof CONTENT_TABLES[number];

interface AutoTagResult {
  table: string;
  tagged: number;
  total: number;
}

function matchSection(
  sections: Section[],
  originalName: string | null,
  originalNumber: string | null
): string | null {
  if (!originalName && !originalNumber) return null;

  // 1. Exact name match (case-insensitive)
  if (originalName) {
    const nameLower = originalName.toLowerCase().trim();
    const exact = sections.find(s => s.name.toLowerCase().trim() === nameLower);
    if (exact) return exact.id;

    // 2. Stripped prefix match (remove leading numbers like "3.2 ")
    const stripped = nameLower.replace(/^\d+(\.\d+)*\s*[-–—.]?\s*/, '');
    if (stripped) {
      const prefixMatch = sections.find(s => {
        const sStripped = s.name.toLowerCase().trim().replace(/^\d+(\.\d+)*\s*[-–—.]?\s*/, '');
        return sStripped === stripped;
      });
      if (prefixMatch) return prefixMatch.id;
    }

    // 3. Contains match
    const containsMatch = sections.find(s =>
      s.name.toLowerCase().includes(nameLower) || nameLower.includes(s.name.toLowerCase())
    );
    if (containsMatch) return containsMatch.id;

    // 4. Word overlap (2+ common words)
    const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
    if (nameWords.length >= 2) {
      let bestMatch: Section | null = null;
      let bestOverlap = 0;
      for (const section of sections) {
        const sWords = section.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const overlap = nameWords.filter(w => sWords.includes(w)).length;
        if (overlap >= 2 && overlap > bestOverlap) {
          bestOverlap = overlap;
          bestMatch = section;
        }
      }
      if (bestMatch) return bestMatch.id;
    }
  }

  // 5. Fallback: exact section_number match
  if (originalNumber) {
    const numMatch = sections.find(s => s.section_number === originalNumber.trim());
    if (numMatch) return numMatch.id;
  }

  return null;
}

export function useAutoTagSections() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const queryClient = useQueryClient();

  const autoTag = async (
    sections: Section[],
    chapterId?: string,
    topicId?: string
  ): Promise<AutoTagResult[]> => {
    if (!sections.length) return [];
    setIsRunning(true);
    const results: AutoTagResult[] = [];

    const filterCol = chapterId ? 'chapter_id' : 'topic_id';
    const filterVal = chapterId || topicId;
    if (!filterVal) { setIsRunning(false); return []; }

    try {
      for (const table of CONTENT_TABLES) {
        setProgress(`Scanning ${table.replace(/_/g, ' ')}...`);

        // Fetch unassigned items that have original section info
        // Not all tables have is_deleted, so we try with it and fall back without
        let items: any[] | null = null;
        let fetchError: any = null;
        
        const baseQuery = () => supabase
          .from(table)
          .select('id, original_section_name, original_section_number')
          .eq(filterCol, filterVal)
          .is('section_id', null);

        const { data: d1, error: e1 } = await baseQuery().eq('is_deleted', false) as any;
        if (e1) {
          // Table might not have is_deleted column, try without
          const { data: d2, error: e2 } = await baseQuery() as any;
          items = d2;
          fetchError = e2;
        } else {
          items = d1;
          fetchError = null;
        }

        if (fetchError || !items?.length) {
          results.push({ table, tagged: 0, total: 0 });
          continue;
        }

        // Filter items that actually have original section info
        const eligibleItems = items.filter(
          (i: any) => i.original_section_name || i.original_section_number
        );

        let tagged = 0;
        // Batch updates by section
        const updates: Record<string, string[]> = {};
        for (const item of eligibleItems) {
          const sectionId = matchSection(
            sections,
            item.original_section_name,
            item.original_section_number
          );
          if (sectionId) {
            if (!updates[sectionId]) updates[sectionId] = [];
            updates[sectionId].push(item.id);
            tagged++;
          }
        }

        // Execute batch updates
        for (const [sectionId, ids] of Object.entries(updates)) {
          await supabase
            .from(table)
            .update({ section_id: sectionId } as never)
            .in('id', ids);
        }

        results.push({ table, tagged, total: eligibleItems.length });
      }

      // Invalidate all content queries
      queryClient.invalidateQueries({
        predicate: () => true,
      });

      setProgress('');
      return results;
    } finally {
      setIsRunning(false);
    }
  };

  return { autoTag, isRunning, progress };
}
