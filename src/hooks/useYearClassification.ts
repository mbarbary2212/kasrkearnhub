import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classifyByModule, type ChapterMetricRow, type ModuleClassification, type ClassifiedChapter } from '@/lib/classifyChapters';

export interface AggregatedClassification {
  strengths: ClassifiedChapter[];
  emerging_strengths: ClassifiedChapter[];
  weaknesses: ClassifiedChapter[];
  improve: ClassifiedChapter[];
  review_due: ClassifiedChapter[];
}

export interface YearClassificationData {
  classification: AggregatedClassification;
  chapterTitleMap: Map<string, string>;
  moduleNameMap: Map<string, string>;
}

function mergeClassifications(modules: ModuleClassification[]): AggregatedClassification {
  const all = {
    strengths: [] as ClassifiedChapter[],
    emerging_strengths: [] as ClassifiedChapter[],
    weaknesses: [] as ClassifiedChapter[],
    improve: [] as ClassifiedChapter[],
    review_due: [] as ClassifiedChapter[],
  };

  for (const m of modules) {
    all.strengths.push(...m.strengths);
    all.emerging_strengths.push(...m.emerging_strengths);
    all.weaknesses.push(...m.weaknesses);
    all.improve.push(...m.improve);
    all.review_due.push(...m.review_due);
  }

  // Sort and limit
  all.weaknesses.sort((a, b) => a.recent_mcq_accuracy - b.recent_mcq_accuracy).splice(3);
  all.improve.sort((a, b) => a.readiness_score - b.readiness_score).splice(3);
  all.emerging_strengths.sort((a, b) => b.readiness_score - a.readiness_score).splice(3);
  all.review_due.sort((a, b) => {
    const da = a.next_review_at ? new Date(a.next_review_at).getTime() : Infinity;
    const db = b.next_review_at ? new Date(b.next_review_at).getTime() : Infinity;
    return da - db;
  }).splice(3);
  all.strengths.sort((a, b) => b.readiness_score - a.readiness_score).splice(3);

  return all;
}

/**
 * Fetches classification data across ALL modules for a year.
 * Returns aggregated classification + chapter/module name maps.
 */
export function useYearClassification(userId: string | undefined, moduleIds: string[]) {
  return useQuery<YearClassificationData | null>({
    queryKey: ['year-classification', userId, moduleIds],
    queryFn: async () => {
      if (!userId || moduleIds.length === 0) return null;

      // Fetch metrics for all modules
      const { data, error } = await supabase
        .from('student_chapter_metrics' as any)
        .select('student_id, module_id, chapter_id, readiness_score, recent_mcq_accuracy, mcq_attempts, next_review_at, overconfident_error_rate')
        .eq('student_id', userId)
        .in('module_id', moduleIds);

      if (error) throw error;

      const rows: ChapterMetricRow[] = (data || []).map((r: any) => ({
        student_id: r.student_id,
        module_id: r.module_id,
        chapter_id: r.chapter_id,
        readiness_score: r.readiness_score,
        recent_mcq_accuracy: r.recent_mcq_accuracy,
        mcq_attempts: r.mcq_attempts,
        next_review_at: r.next_review_at,
        overconfident_error_rate: r.overconfident_error_rate,
      }));

      if (rows.length === 0) return null;

      const moduleClassifications = classifyByModule(rows);
      const classification = mergeClassifications(moduleClassifications);

      // Fetch chapter titles for all relevant chapter IDs
      const allChapterIds = new Set<string>();
      const allCategories = [classification.strengths, classification.emerging_strengths, classification.weaknesses, classification.improve, classification.review_due];
      for (const cat of allCategories) {
        for (const ch of cat) allChapterIds.add(ch.chapter_id);
      }

      const chapterTitleMap = new Map<string, string>();
      if (allChapterIds.size > 0) {
        const { data: chapters } = await supabase
          .from('module_chapters')
          .select('id, title')
          .in('id', Array.from(allChapterIds));
        for (const ch of chapters || []) {
          chapterTitleMap.set(ch.id, ch.title);
        }
      }

      // Fetch module names
      const moduleNameMap = new Map<string, string>();
      const { data: mods } = await supabase
        .from('modules')
        .select('id, name, slug')
        .in('id', moduleIds);
      for (const m of mods || []) {
        moduleNameMap.set(m.id, m.slug ? `${m.slug.toUpperCase()} — ${m.name}` : m.name);
      }

      return { classification, chapterTitleMap, moduleNameMap };
    },
    enabled: !!userId && moduleIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
