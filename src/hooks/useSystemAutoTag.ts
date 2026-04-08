import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Content tables that support section_id tagging.
 * Each entry: [tableName, contentColumns, filterColumn]
 * filterColumn is used to scope by chapter or topic.
 */
const CONTENT_TABLES = [
  { table: 'lectures', cols: ['title'], hasDeleted: false },
  { table: 'resources', cols: ['title'], hasDeleted: false },
  { table: 'study_resources', cols: ['title'], hasDeleted: false },
  { table: 'mcqs', cols: ['stem', 'explanation'], hasDeleted: true },
  { table: 'mcq_sets', cols: ['title'], hasDeleted: false },
  { table: 'essays', cols: ['title', 'model_answer'], hasDeleted: true },
  { table: 'practicals', cols: ['title'], hasDeleted: true },
  { table: 'osce_questions', cols: ['history_text'], hasDeleted: true },
  { table: 'matching_questions', cols: ['instruction'], hasDeleted: true },
  { table: 'true_false_questions', cols: ['statement', 'explanation'], hasDeleted: true },
  { table: 'virtual_patient_cases', cols: ['title'], hasDeleted: true },
  { table: 'mind_maps', cols: ['title', 'section_title'], hasDeleted: false },
  { table: 'interactive_algorithms', cols: ['title'], hasDeleted: true },
  { table: 'case_scenarios', cols: ['stem'], hasDeleted: true },
] as const;

type TableDef = typeof CONTENT_TABLES[number];

interface Section {
  id: string;
  name: string;
  chapter_id: string | null;
  topic_id: string | null;
}

export interface SystemAutoTagProgress {
  phase: string;
  currentTable: string;
  tablesProcessed: number;
  totalTables: number;
  itemsProcessed: number;
  totalItems: number;
  itemsTagged: number;
  itemsSkipped: number;
  errors: string[];
  /** Per-table breakdown */
  tableResults: Record<string, { total: number; tagged: number; skipped: number }>;
}

const BATCH_SIZE = 80;

function extractContent(row: any, cols: readonly string[]): string {
  const parts: string[] = [];
  for (const col of cols) {
    const val = row[col];
    if (val && typeof val === 'string' && val.trim()) {
      parts.push(val.trim());
    }
  }
  return parts.join(' | ').substring(0, 500);
}

export function useSystemAutoTag() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SystemAutoTagProgress | null>(null);
  const abortRef = useRef(false);
  const queryClient = useQueryClient();

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const runSystemAutoTag = useCallback(async (overwriteHighConfidence = false) => {
    setIsRunning(true);
    abortRef.current = false;

    const prog: SystemAutoTagProgress = {
      phase: 'Loading sections...',
      currentTable: '',
      tablesProcessed: 0,
      totalTables: CONTENT_TABLES.length,
      itemsProcessed: 0,
      totalItems: 0,
      itemsTagged: 0,
      itemsSkipped: 0,
      errors: [],
      tableResults: {},
    };
    setProgress({ ...prog });

    try {
      // 1. Fetch ALL sections grouped by chapter
      const { data: allSections, error: secError } = await supabase
        .from('sections' as any)
        .select('id, name, chapter_id, topic_id')
        .order('display_order');

      if (secError || !allSections?.length) {
        prog.errors.push('Failed to load sections: ' + (secError?.message || 'No sections found'));
        setProgress({ ...prog });
        setIsRunning(false);
        return prog;
      }

      const sections = allSections as unknown as Section[];

      // Group sections by chapter_id
      const sectionsByChapter = new Map<string, Section[]>();
      for (const s of sections) {
        const key = s.chapter_id || s.topic_id || '__none__';
        if (!sectionsByChapter.has(key)) sectionsByChapter.set(key, []);
        sectionsByChapter.get(key)!.push(s);
      }

      prog.phase = 'Scanning content tables...';
      setProgress({ ...prog });

      // 2. Process each content table
      for (let ti = 0; ti < CONTENT_TABLES.length; ti++) {
        if (abortRef.current) break;

        const tableDef = CONTENT_TABLES[ti];
        const { table, cols, hasDeleted } = tableDef;
        prog.currentTable = table;
        prog.tablesProcessed = ti;
        prog.phase = `Scanning ${table.replace(/_/g, ' ')}...`;
        setProgress({ ...prog });

        // Fetch untagged items (no section_id)
        const selectCols = ['id', 'chapter_id', ...cols].join(', ');

        let query = supabase
          .from(table as any)
          .select(selectCols)
          .is('section_id', null)
          .limit(1000);

        if (hasDeleted) {
          query = query.eq('is_deleted', false);
        }

        const { data: rawItems, error: fetchErr } = await (query as any);

        if (fetchErr) {
          // Retry without is_deleted filter
          const { data: retryItems } = await supabase
            .from(table as any)
            .select(selectCols)
            .is('section_id', null)
            .limit(1000) as any;
          
          if (!retryItems?.length) {
            prog.tableResults[table] = { total: 0, tagged: 0, skipped: 0 };
            continue;
          }
          // Use retry results
          await processTableItems(retryItems, tableDef, sectionsByChapter, prog, overwriteHighConfidence);
        } else if (rawItems?.length) {
          await processTableItems(rawItems, tableDef, sectionsByChapter, prog, overwriteHighConfidence);
        } else {
          prog.tableResults[table] = { total: 0, tagged: 0, skipped: 0 };
        }

        setProgress({ ...prog });
      }

      prog.tablesProcessed = CONTENT_TABLES.length;
      prog.phase = 'Complete';
      setProgress({ ...prog });

      // Invalidate all queries
      queryClient.invalidateQueries({ predicate: () => true });

      return prog;
    } catch (err) {
      prog.errors.push(`System error: ${err instanceof Error ? err.message : 'Unknown'}`);
      prog.phase = 'Failed';
      setProgress({ ...prog });
      return prog;
    } finally {
      setIsRunning(false);
    }
  }, [queryClient]);

  return { runSystemAutoTag, isRunning, progress, abort };
}

async function processTableItems(
  items: any[],
  tableDef: TableDef,
  sectionsByChapter: Map<string, Section[]>,
  prog: SystemAutoTagProgress,
  overwriteHighConfidence: boolean,
) {
  const { table, cols } = tableDef;
  prog.totalItems += items.length;
  prog.tableResults[table] = { total: items.length, tagged: 0, skipped: 0 };

  // Group items by chapter_id to batch AI calls per chapter context
  const itemsByChapter = new Map<string, any[]>();
  for (const item of items) {
    const key = item.chapter_id || '__none__';
    if (!itemsByChapter.has(key)) itemsByChapter.set(key, []);
    itemsByChapter.get(key)!.push(item);
  }

  for (const [chapterId, chapterItems] of itemsByChapter.entries()) {
    const chapterSections = sectionsByChapter.get(chapterId);
    if (!chapterSections?.length) {
      // No sections defined for this chapter — skip
      prog.itemsSkipped += chapterItems.length;
      prog.tableResults[table].skipped += chapterItems.length;
      prog.itemsProcessed += chapterItems.length;
      continue;
    }

    // Process in batches
    for (let i = 0; i < chapterItems.length; i += BATCH_SIZE) {
      const batch = chapterItems.slice(i, i + BATCH_SIZE);

      const aiItems = batch.map((item: any) => ({
        id: item.id,
        content: extractContent(item, cols as unknown as string[]),
        table,
      }));

      prog.phase = `AI analyzing ${table} (${i + 1}-${Math.min(i + BATCH_SIZE, chapterItems.length)}/${chapterItems.length})...`;

      try {
        const response = await supabase.functions.invoke('ai-auto-tag-sections', {
          body: {
            items: aiItems,
            sections: chapterSections.map(s => ({ id: s.id, name: s.name })),
          },
        });

        if (response.error) {
          prog.errors.push(`AI error for ${table}: ${response.error.message || 'Unknown'}`);
          prog.itemsProcessed += batch.length;
          continue;
        }

        const assignments: Record<string, { section_id: string; confidence: string } | string | null> =
          response.data?.assignments || {};

        // Group by section for batch updates
        const updates: Record<string, string[]> = {};
        let batchTagged = 0;

        for (const item of batch) {
          const assignment = assignments[item.id];
          if (!assignment) {
            prog.itemsSkipped++;
            prog.tableResults[table].skipped++;
            continue;
          }

          let sectionId: string;
          let confidence: string;

          if (typeof assignment === 'string') {
            sectionId = assignment;
            confidence = 'medium';
          } else if (assignment && typeof assignment === 'object') {
            sectionId = assignment.section_id;
            confidence = assignment.confidence || 'medium';
          } else {
            prog.itemsSkipped++;
            prog.tableResults[table].skipped++;
            continue;
          }

          // Safety: only overwrite existing if high confidence and flag set
          if (!overwriteHighConfidence && confidence !== 'high' && confidence !== 'medium') {
            // low confidence on items without section is still acceptable
          }

          if (!updates[sectionId]) updates[sectionId] = [];
          updates[sectionId].push(item.id);
          batchTagged++;
        }

        // Apply updates
        for (const [sectionId, ids] of Object.entries(updates)) {
          await supabase
            .from(table as any)
            .update({ section_id: sectionId } as never)
            .in('id', ids);
        }

        prog.itemsTagged += batchTagged;
        prog.tableResults[table].tagged += batchTagged;
        prog.itemsProcessed += batch.length;
      } catch (err) {
        prog.errors.push(`Error processing ${table} batch: ${err instanceof Error ? err.message : 'Unknown'}`);
        prog.itemsProcessed += batch.length;
      }
    }
  }
}
