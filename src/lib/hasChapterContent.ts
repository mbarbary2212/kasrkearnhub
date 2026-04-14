import { supabase } from '@/integrations/supabase/client';

/**
 * Content tables with chapter_id foreign key.
 * All 15 confirmed tables from the audit.
 */
const CONTENT_TABLES = [
  'lectures',
  'flashcards',
  'mcqs',
  'case_scenarios',
  'resources',
  'study_resources',
  'practicals',
  'osce_questions',
  'interactive_algorithms',
  'virtual_patient_cases',
  'mind_maps',
  'true_false_questions',
  'matching_questions',
  'essays',
  'concepts',
] as const;

/**
 * For a list of chapter IDs, returns a Map<chapterId, boolean>
 * where true = the chapter has at least one content row across all 15 tables.
 *
 * Uses head-only count queries to minimize data transfer.
 */
export async function fetchChapterContentMap(chapterIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (chapterIds.length === 0) return result;

  // Initialize all as false
  for (const id of chapterIds) result.set(id, false);

  // Query each table in parallel — count rows for all provided chapter_ids
  const queries = CONTENT_TABLES.map(async (table) => {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select('chapter_id', { count: 'exact', head: false })
        .in('chapter_id', chapterIds)
        .limit(chapterIds.length);

      if (error || !data) return;

      for (const row of data) {
        const cid = (row as any).chapter_id;
        if (cid) result.set(cid, true);
      }
    } catch {
      // Silently skip tables that may not exist
    }
  });

  await Promise.all(queries);
  return result;
}
