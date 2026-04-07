import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Section } from '@/hooks/useSections';
import { useQueryClient } from '@tanstack/react-query';

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
  'mind_maps',
] as const;

type ContentTable = typeof CONTENT_TABLES[number];

/** Columns to fetch per table for rich AI content analysis */
const CONTENT_COLUMNS: Record<ContentTable, string[]> = {
  lectures: ['title'],
  resources: ['title'],
  study_resources: ['title'],
  mcqs: ['stem', 'explanation'],
  mcq_sets: ['title'],
  essays: ['title', 'model_answer'],
  practicals: ['title'],
  osce_questions: ['history_text'],
  matching_questions: ['instruction'],
  true_false_questions: ['statement', 'explanation'],
  virtual_patient_cases: ['title'],
  mind_maps: ['title', 'section_title'],
};

interface AutoTagResult {
  table: string;
  tagged: number;
  total: number;
}

interface UnmatchedItem {
  id: string;
  content: string;
  table: string;
}

/** Build a select string that includes id + all content columns */
function buildSelect(table: ContentTable): string {
  const cols = CONTENT_COLUMNS[table];
  return ['id', ...cols].join(', ');
}

/** Concatenate content columns from a row into a single string */
function extractContent(row: any, table: ContentTable): string {
  const cols = CONTENT_COLUMNS[table];
  const parts: string[] = [];

  for (const col of cols) {
    const val = row[col];
    if (val && typeof val === 'string' && val.trim()) {
      parts.push(val.trim());
    }
  }

  // For MCQs, also include choices text if fetched via stem
  if ((table === 'mcqs') && row.choices && Array.isArray(row.choices)) {
    for (const c of row.choices) {
      if (c.text) parts.push(`${c.key}: ${c.text}`);
    }
  }

  return parts.join(' | ').substring(0, 500);
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
    const allUnmatched: UnmatchedItem[] = [];

    const filterCol = chapterId ? 'chapter_id' : 'topic_id';
    const filterVal = chapterId || topicId;
    if (!filterVal) { setIsRunning(false); return []; }

    try {
      // ── Collect untagged items with rich content ──
      for (const table of CONTENT_TABLES) {
        setProgress(`Scanning ${table.replace(/_/g, ' ')}...`);

        // For MCQs we need choices too — add it to select
        const selectCols = table === 'mcqs'
          ? `${buildSelect(table)}, choices`
          : buildSelect(table);

        const baseQuery = () => supabase
          .from(table as any)
          .select(selectCols)
          .eq(filterCol, filterVal)
          .is('section_id', null);

        let items: any[] | null = null;

        // Try with is_deleted filter first, fallback without
        const { data: d1, error: e1 } = await baseQuery().eq('is_deleted', false) as any;
        if (e1) {
          const { data: d2 } = await baseQuery() as any;
          items = d2;
        } else {
          items = d1;
        }

        if (!items?.length) {
          results.push({ table, tagged: 0, total: 0 });
          continue;
        }

        results.push({ table, tagged: 0, total: items.length });

        for (const item of items) {
          const content = extractContent(item, table);
          if (content) {
            allUnmatched.push({
              id: item.id,
              content: content.substring(0, 500),
              table,
            });
          }
        }
      }

      // ── AI matching pass ──
      let aiTagged = 0;
      if (allUnmatched.length > 0) {
        setProgress(`AI analyzing ${allUnmatched.length} items...`);

        try {
          const response = await supabase.functions.invoke('ai-auto-tag-sections', {
            body: {
              items: allUnmatched.slice(0, 200),
              sections: sections.map(s => ({ id: s.id, name: s.name })),
            },
          });

          if (response.error) {
            console.error('AI auto-tag error:', response.error);
          } else {
            const assignments: Record<string, string | null> = response.data?.assignments || {};

            // Group assignments by table for batch updates
            const tableUpdates: Record<string, Record<string, string[]>> = {};
            for (const item of allUnmatched) {
              const sectionId = assignments[item.id];
              if (sectionId) {
                if (!tableUpdates[item.table]) tableUpdates[item.table] = {};
                if (!tableUpdates[item.table][sectionId]) tableUpdates[item.table][sectionId] = [];
                tableUpdates[item.table][sectionId].push(item.id);
                aiTagged++;
              }
            }

            // Apply AI assignments to DB
            for (const [table, sectionMap] of Object.entries(tableUpdates)) {
              for (const [sectionId, ids] of Object.entries(sectionMap)) {
                await supabase
                  .from(table as any)
                  .update({ section_id: sectionId } as never)
                  .in('id', ids);
              }
            }

            // Update results with AI matches
            for (const [table, sectionMap] of Object.entries(tableUpdates)) {
              const aiCount = Object.values(sectionMap).reduce((s, ids) => s + ids.length, 0);
              const existing = results.find(r => r.table === table);
              if (existing) {
                existing.tagged += aiCount;
              }
            }
          }
        } catch (aiErr) {
          console.error('AI auto-tag failed:', aiErr);
        }
      }

      queryClient.invalidateQueries({ predicate: () => true });
      setProgress('');

      (results as any).__aiTagged = aiTagged;
      (results as any).__keywordTagged = 0;

      return results;
    } finally {
      setIsRunning(false);
    }
  };

  return { autoTag, isRunning, progress };
}
