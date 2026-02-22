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
] as const;

type ContentTable = typeof CONTENT_TABLES[number];

const TITLE_COLUMN: Record<ContentTable, string> = {
  lectures: 'title',
  resources: 'title',
  study_resources: 'title',
  essays: 'title',
  practicals: 'title',
  mcq_sets: 'title',
  virtual_patient_cases: 'title',
  mcqs: 'stem',
  true_false_questions: 'statement',
  osce_questions: 'history_text',
  matching_questions: 'instruction',
};

interface AutoTagResult {
  table: string;
  tagged: number;
  total: number;
}

interface UnmatchedItem {
  id: string;
  title: string;
  table: string;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for',
  'is', 'are', 'was', 'were', 'be', 'been', 'with', 'by', 'from', 'as',
  'it', 'its', 'this', 'that', 'which', 'who', 'what', 'how', 'when',
  'where', 'not', 'no', 'do', 'does', 'did', 'has', 'have', 'had',
]);

function stripPrefix(name: string): string {
  return name.replace(/^\d+(\.\d+)*\s*[-–—.]?\s*/, '').toLowerCase().trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-–—_.,;:!?/\\()\[\]{}]+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function matchSection(
  sections: Section[],
  originalName: string | null,
  originalNumber: string | null
): string | null {
  if (!originalName && !originalNumber) return null;

  if (originalName) {
    const nameLower = originalName.toLowerCase().trim();
    const exact = sections.find(s => s.name.toLowerCase().trim() === nameLower);
    if (exact) return exact.id;

    const stripped = nameLower.replace(/^\d+(\.\d+)*\s*[-–—.]?\s*/, '');
    if (stripped) {
      const prefixMatch = sections.find(s => {
        const sStripped = s.name.toLowerCase().trim().replace(/^\d+(\.\d+)*\s*[-–—.]?\s*/, '');
        return sStripped === stripped;
      });
      if (prefixMatch) return prefixMatch.id;
    }

    const containsMatch = sections.find(s =>
      s.name.toLowerCase().includes(nameLower) || nameLower.includes(s.name.toLowerCase())
    );
    if (containsMatch) return containsMatch.id;

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

  if (originalNumber) {
    const numMatch = sections.find(s => s.section_number === originalNumber.trim());
    if (numMatch) return numMatch.id;
  }

  return null;
}

function matchSectionByTitle(
  sections: Section[],
  title: string | null
): string | null {
  if (!title || !title.trim()) return null;

  const titleTokens = tokenize(title);
  if (!titleTokens.length) return null;

  let bestSection: Section | null = null;
  let bestScore = 0;
  let bestIsSubstring = false;

  for (const section of sections) {
    const strippedName = stripPrefix(section.name);
    const sectionTokens = tokenize(strippedName);
    if (!sectionTokens.length) continue;

    const overlap = sectionTokens.filter(w => titleTokens.includes(w)).length;
    if (overlap < 1) continue;

    const isSubstring = title.toLowerCase().includes(strippedName) ||
      strippedName.includes(title.toLowerCase().trim());

    if (
      overlap > bestScore ||
      (overlap === bestScore && isSubstring && !bestIsSubstring)
    ) {
      bestScore = overlap;
      bestSection = section;
      bestIsSubstring = isSubstring;
    }
  }

  return bestSection?.id ?? null;
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

    // Track keyword-matched items per table for DB updates
    const keywordUpdates: Record<string, Record<string, string[]>> = {};

    try {
      // ── Step 1: Keyword matching pass ──
      for (const table of CONTENT_TABLES) {
        setProgress(`Scanning ${table.replace(/_/g, ' ')}...`);

        const titleCol = TITLE_COLUMN[table];
        const selectCols = `id, ${titleCol}, original_section_name, original_section_number`;

        let items: any[] | null = null;

        const baseQuery = () => supabase
          .from(table)
          .select(selectCols)
          .eq(filterCol, filterVal)
          .is('section_id', null);

        const { data: d1, error: e1 } = await baseQuery().eq('is_deleted', false) as any;
        if (e1) {
          const { data: d2, error: e2 } = await baseQuery() as any;
          items = d2;
          if (e2) { results.push({ table, tagged: 0, total: 0 }); continue; }
        } else {
          items = d1;
        }

        if (!items?.length) {
          results.push({ table, tagged: 0, total: 0 });
          continue;
        }

        let tagged = 0;
        const updates: Record<string, string[]> = {};

        for (const item of items) {
          // Try original section info first
          let sectionId = matchSection(
            sections,
            item.original_section_name,
            item.original_section_number
          );

          // Fallback to title-based matching
          if (!sectionId) {
            sectionId = matchSectionByTitle(sections, item[titleCol]);
          }

          if (sectionId) {
            if (!updates[sectionId]) updates[sectionId] = [];
            updates[sectionId].push(item.id);
            tagged++;
          } else {
            // Collect unmatched for AI pass
            const titleText = item[titleCol];
            if (titleText && titleText.trim()) {
              allUnmatched.push({
                id: item.id,
                title: titleText.trim().substring(0, 200),
                table,
              });
            }
          }
        }

        // Apply keyword matches to DB
        for (const [sectionId, ids] of Object.entries(updates)) {
          await supabase
            .from(table)
            .update({ section_id: sectionId } as never)
            .in('id', ids);
        }

        keywordUpdates[table] = updates;
        results.push({ table, tagged, total: items.length });
      }

      const keywordTagged = results.reduce((s, r) => s + r.tagged, 0);

      // ── Step 2: AI matching pass (only for unmatched) ──
      let aiTagged = 0;
      if (allUnmatched.length > 0) {
        setProgress(`AI analyzing ${allUnmatched.length} remaining items...`);

        try {
          const { data: session } = await supabase.auth.getSession();
          const token = session?.session?.access_token;
          if (!token) throw new Error('No auth session');

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
          console.error('AI auto-tag failed, falling back to keyword-only:', aiErr);
          // Graceful fallback - keyword results still apply
        }
      }

      queryClient.invalidateQueries({ predicate: () => true });
      setProgress('');

      // Store AI tagged count for the caller
      (results as any).__aiTagged = aiTagged;
      (results as any).__keywordTagged = keywordTagged;

      return results;
    } finally {
      setIsRunning(false);
    }
  };

  return { autoTag, isRunning, progress };
}
