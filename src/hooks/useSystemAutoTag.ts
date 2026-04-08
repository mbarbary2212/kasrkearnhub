import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const CONTENT_TABLES = [
  { table: 'lectures', cols: ['title'], hasDeleted: true },
  { table: 'resources', cols: ['title'], hasDeleted: true },
  { table: 'study_resources', cols: ['title'], hasDeleted: true },
  { table: 'mcqs', cols: ['stem', 'explanation'], hasDeleted: true },
  { table: 'mcq_sets', cols: ['title'], hasDeleted: true },
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

export interface SkipReasons {
  alreadyTagged: number;
  noChapter: number;
  noSectionsForChapter: number;
  aiNoMatch: number;
}

export interface TableResult {
  scanned: number;
  eligible: number;
  tagged: number;
  skipped: number;
  skipReasons: SkipReasons;
}

export interface SystemAutoTagProgress {
  phase: string;
  currentTable: string;
  tablesProcessed: number;
  totalTables: number;
  itemsScanned: number;
  itemsEligible: number;
  itemsProcessed: number;
  itemsTagged: number;
  itemsSkipped: number;
  skipReasons: SkipReasons;
  errors: string[];
  tableResults: Record<string, TableResult>;
}

const BATCH_SIZE = 40;

function emptySkipReasons(): SkipReasons {
  return { alreadyTagged: 0, noChapter: 0, noSectionsForChapter: 0, aiNoMatch: 0 };
}

function emptyTableResult(): TableResult {
  return { scanned: 0, eligible: 0, tagged: 0, skipped: 0, skipReasons: emptySkipReasons() };
}

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
      itemsScanned: 0,
      itemsEligible: 0,
      itemsProcessed: 0,
      itemsTagged: 0,
      itemsSkipped: 0,
      skipReasons: emptySkipReasons(),
      errors: [],
      tableResults: {},
    };
    setProgress({ ...prog });

    try {
      // 1. Fetch ALL sections
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

        const tr = emptyTableResult();
        prog.tableResults[table] = tr;

        // --- Step A: Count total rows (scanned) including already-tagged ---
        const countCols = 'id, section_id, chapter_id';
        let countQuery = supabase.from(table as any).select(countCols).limit(5000);
        if (hasDeleted) countQuery = countQuery.eq('is_deleted', false);

        const { data: allRows, error: countErr } = await (countQuery as any);
        if (countErr) {
          // Retry without is_deleted
          const { data: retryAll } = await supabase.from(table as any).select(countCols).limit(5000) as any;
          if (retryAll?.length) {
            const alreadyTagged = retryAll.filter((r: any) => r.section_id != null).length;
            tr.scanned = retryAll.length;
            tr.skipReasons.alreadyTagged = alreadyTagged;
            prog.skipReasons.alreadyTagged += alreadyTagged;
            prog.itemsScanned += retryAll.length;

            const untagged = retryAll.filter((r: any) => r.section_id == null);
            if (untagged.length > 0) {
              // Fetch full content for untagged
              const selectCols = ['id', 'chapter_id', ...cols].join(', ');
              const { data: fullItems } = await supabase
                .from(table as any)
                .select(selectCols)
                .is('section_id', null)
                .limit(1000) as any;
              if (fullItems?.length) {
                await processTableItems(fullItems, tableDef, sectionsByChapter, prog, tr, overwriteHighConfidence);
              }
            }
          }
        } else if (allRows?.length) {
          const alreadyTagged = allRows.filter((r: any) => r.section_id != null).length;
          tr.scanned = allRows.length;
          tr.skipReasons.alreadyTagged = alreadyTagged;
          prog.skipReasons.alreadyTagged += alreadyTagged;
          prog.itemsScanned += allRows.length;

          const untagged = allRows.filter((r: any) => r.section_id == null);
          if (untagged.length > 0) {
            // Fetch full content for untagged items
            const selectCols = ['id', 'chapter_id', ...cols].join(', ');
            let query = supabase.from(table as any).select(selectCols).is('section_id', null).limit(1000);
            if (hasDeleted) query = query.eq('is_deleted', false);
            const { data: rawItems } = await (query as any);
            if (rawItems?.length) {
              await processTableItems(rawItems, tableDef, sectionsByChapter, prog, tr, overwriteHighConfidence);
            }
          }
        } else {
          tr.scanned = 0;
        }

        // Compute skipped for table
        tr.skipped = tr.skipReasons.alreadyTagged + tr.skipReasons.noChapter + tr.skipReasons.noSectionsForChapter + tr.skipReasons.aiNoMatch;

        setProgress({ ...prog });
      }

      prog.tablesProcessed = CONTENT_TABLES.length;
      prog.phase = 'Complete';
      // Recompute totals
      prog.itemsSkipped = prog.skipReasons.alreadyTagged + prog.skipReasons.noChapter + prog.skipReasons.noSectionsForChapter + prog.skipReasons.aiNoMatch;
      setProgress({ ...prog });

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
  tr: TableResult,
  overwriteHighConfidence: boolean,
) {
  const { table, cols } = tableDef;

  tr.eligible += items.length;
  prog.itemsEligible += items.length;

  // Group items by chapter_id
  const itemsByChapter = new Map<string, any[]>();
  const noChapterItems: any[] = [];

  for (const item of items) {
    if (!item.chapter_id) {
      noChapterItems.push(item);
    } else {
      const key = item.chapter_id;
      if (!itemsByChapter.has(key)) itemsByChapter.set(key, []);
      itemsByChapter.get(key)!.push(item);
    }
  }

  // Handle no-chapter items
  if (noChapterItems.length > 0) {
    tr.skipReasons.noChapter += noChapterItems.length;
    prog.skipReasons.noChapter += noChapterItems.length;
    prog.itemsProcessed += noChapterItems.length;
  }

  for (const [chapterId, chapterItems] of itemsByChapter.entries()) {
    const chapterSections = sectionsByChapter.get(chapterId);
    if (!chapterSections?.length) {
      tr.skipReasons.noSectionsForChapter += chapterItems.length;
      prog.skipReasons.noSectionsForChapter += chapterItems.length;
      prog.itemsProcessed += chapterItems.length;
      continue;
    }

    // Process in batches
    for (let i = 0; i < chapterItems.length; i += BATCH_SIZE) {
      if ((prog as any).__abort) break;

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

        const updates: Record<string, string[]> = {};
        let batchTagged = 0;

        for (const item of batch) {
          const assignment = assignments[item.id];
          if (!assignment) {
            tr.skipReasons.aiNoMatch++;
            prog.skipReasons.aiNoMatch++;
            continue;
          }

          let sectionId: string;
          if (typeof assignment === 'string') {
            sectionId = assignment;
          } else if (assignment && typeof assignment === 'object') {
            sectionId = assignment.section_id;
          } else {
            tr.skipReasons.aiNoMatch++;
            prog.skipReasons.aiNoMatch++;
            continue;
          }

          if (!updates[sectionId]) updates[sectionId] = [];
          updates[sectionId].push(item.id);
          batchTagged++;
        }

        for (const [sectionId, ids] of Object.entries(updates)) {
          await supabase
            .from(table as any)
            .update({ section_id: sectionId } as never)
            .in('id', ids);
        }

        tr.tagged += batchTagged;
        prog.itemsTagged += batchTagged;
        prog.itemsProcessed += batch.length;
      } catch (err) {
        prog.errors.push(`Error processing ${table} batch: ${err instanceof Error ? err.message : 'Unknown'}`);
        prog.itemsProcessed += batch.length;
      }
    }
  }
}
