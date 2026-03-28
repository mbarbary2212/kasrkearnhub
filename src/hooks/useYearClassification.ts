import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classifyByModule, type ChapterMetricRow, type ModuleClassification, type ClassifiedChapter } from '@/lib/classifyChapters';
import { type ChapterExamWeight, getExamWeightBoost } from './useChapterExamWeights';

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

function mergeClassifications(
  modules: ModuleClassification[],
  weightMap?: Map<string, ChapterExamWeight>
): AggregatedClassification {
  // Collect all candidates per category
  const allWeaknesses: ClassifiedChapter[] = [];
  const allReviewDue: ClassifiedChapter[] = [];
  const allImprove: ClassifiedChapter[] = [];
  const allEmerging: ClassifiedChapter[] = [];
  const allStrengths: ClassifiedChapter[] = [];

  for (const m of modules) {
    allWeaknesses.push(...m.weaknesses);
    allReviewDue.push(...m.review_due);
    allImprove.push(...m.improve);
    allEmerging.push(...m.emerging_strengths);
    allStrengths.push(...m.strengths);
  }

  // Sort each pool - apply exam weight boost to sorting
  const boost = (ch: ClassifiedChapter) => getExamWeightBoost(ch.chapter_id, weightMap);

  // Weaknesses: lowest accuracy first, boosted by exam weight (high weight = more urgent)
  allWeaknesses.sort((a, b) => {
    const scoreA = a.recent_mcq_accuracy / boost(a);
    const scoreB = b.recent_mcq_accuracy / boost(b);
    return scoreA - scoreB;
  });

  allReviewDue.sort((a, b) => {
    const da = a.next_review_at ? new Date(a.next_review_at).getTime() : Infinity;
    const db = b.next_review_at ? new Date(b.next_review_at).getTime() : Infinity;
    // Weight-boosted chapters get priority when review dates are close
    const timeDiff = da - db;
    if (Math.abs(timeDiff) < 86400000) { // within 1 day
      return boost(b) - boost(a);
    }
    return timeDiff;
  });

  // Improve: lower readiness first, exam weight boosts priority
  allImprove.sort((a, b) => {
    const scoreA = a.readiness_score / boost(a);
    const scoreB = b.readiness_score / boost(b);
    return scoreA - scoreB;
  });

  allEmerging.sort((a, b) => b.readiness_score - a.readiness_score);
  allStrengths.sort((a, b) => b.readiness_score - a.readiness_score);

  // Deduplicate by priority: Needs Attention > Today's Plan (review_due) > Improve > Good Progress > Strengths
  const seen = new Set<string>();

  const pick = (pool: ClassifiedChapter[], limit: number): ClassifiedChapter[] => {
    const result: ClassifiedChapter[] = [];
    for (const ch of pool) {
      if (seen.has(ch.chapter_id)) continue;
      seen.add(ch.chapter_id);
      result.push(ch);
      if (result.length >= limit) break;
    }
    return result;
  };

  const weaknesses = pick(allWeaknesses, 3);
  const review_due = pick(allReviewDue, 3);
  const improve = pick(allImprove, 3);
  const emerging_strengths = pick(allEmerging, 3);
  const strengths = pick(allStrengths, 3);

  return { strengths, emerging_strengths, weaknesses, improve, review_due };
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
