import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChapterExamWeight {
  chapter_id: string;
  module_id: string;
  total_weight_percent: number;
  total_weight_marks: number;
}

/**
 * Fetches aggregated exam weights per chapter across all active assessments for given modules.
 * Returns a Map of chapter_id → total weight percent (sum across all components/assessments).
 */
export function useChapterExamWeights(moduleIds: string[]) {
  return useQuery({
    queryKey: ['chapter-exam-weights', moduleIds],
    queryFn: async () => {
      if (moduleIds.length === 0) return new Map<string, ChapterExamWeight>();

      // Get active assessment IDs for these modules
      const { data: assessments } = await supabase
        .from('assessment_structures')
        .select('id, module_id')
        .in('module_id', moduleIds)
        .eq('is_active', true);

      if (!assessments || assessments.length === 0) return new Map<string, ChapterExamWeight>();

      const assessmentIds = assessments.map(a => a.id);

      const { data: weights } = await supabase
        .from('topic_exam_weights')
        .select('chapter_id, module_id, weight_percent, weight_marks')
        .in('assessment_id', assessmentIds)
        .not('chapter_id', 'is', null);

      if (!weights || weights.length === 0) return new Map<string, ChapterExamWeight>();

      // Aggregate per chapter
      const map = new Map<string, ChapterExamWeight>();
      for (const w of weights) {
        if (!w.chapter_id) continue;
        const existing = map.get(w.chapter_id);
        if (existing) {
          existing.total_weight_percent += Number(w.weight_percent) || 0;
          existing.total_weight_marks += Number(w.weight_marks) || 0;
        } else {
          map.set(w.chapter_id, {
            chapter_id: w.chapter_id,
            module_id: w.module_id,
            total_weight_percent: Number(w.weight_percent) || 0,
            total_weight_marks: Number(w.weight_marks) || 0,
          });
        }
      }

      return map;
    },
    enabled: moduleIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Applies exam weight boosting to priority scores.
 * Chapters with higher exam weights get priority boosts.
 * Returns a multiplier (1.0 = no boost, up to ~2.0 for heavily weighted chapters).
 */
export function getExamWeightBoost(
  chapterId: string,
  weightMap: Map<string, ChapterExamWeight> | undefined
): number {
  if (!weightMap) return 1.0;
  const w = weightMap.get(chapterId);
  if (!w || w.total_weight_percent === 0) return 1.0;

  // Normalize: 10% weight → 1.3x boost, 20%+ → up to 2.0x
  return Math.min(2.0, 1.0 + (w.total_weight_percent / 20));
}
