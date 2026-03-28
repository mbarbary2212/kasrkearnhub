import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStudyMode, type StudyMode } from '@/lib/studyModes';

export interface ChapterExamWeight {
  chapter_id: string;
  module_id: string;
  total_weight_percent: number;
  total_weight_marks: number;
  /** Per-component breakdown keyed by component_type */
  component_weights: Record<string, { percent: number; marks: number }>;
  dominant_component: string | null;
  /** Set when second-highest weight >= 70% of dominant */
  secondary_component: string | null;
  prescribed_study_mode: StudyMode;
}

const SECONDARY_THRESHOLD = 0.7;

/**
 * Fetches aggregated exam weights per chapter across all active assessments for given modules.
 * Now includes per-component breakdown and dominant/secondary component analysis.
 */
export function useChapterExamWeights(moduleIds: string[]) {
  return useQuery({
    queryKey: ['chapter-exam-weights', moduleIds],
    queryFn: async () => {
      if (moduleIds.length === 0) return new Map<string, ChapterExamWeight>();

      const { data: assessments } = await supabase
        .from('assessment_structures')
        .select('id, module_id')
        .in('module_id', moduleIds)
        .eq('is_active', true);

      if (!assessments || assessments.length === 0) return new Map<string, ChapterExamWeight>();

      const assessmentIds = assessments.map(a => a.id);

      // Fetch weights joined with component type
      const { data: weights } = await supabase
        .from('topic_exam_weights')
        .select('chapter_id, module_id, weight_percent, weight_marks, component_id, assessment_components!inner(component_type)')
        .in('assessment_id', assessmentIds)
        .not('chapter_id', 'is', null)
        .not('component_id', 'is', null);

      if (!weights || weights.length === 0) return new Map<string, ChapterExamWeight>();

      // Build per-chapter aggregation
      const map = new Map<string, {
        module_id: string;
        totalPercent: number;
        totalMarks: number;
        byComponent: Record<string, { percent: number; marks: number }>;
      }>();

      for (const w of weights as any[]) {
        if (!w.chapter_id) continue;
        const componentType: string = w.assessment_components?.component_type || 'unknown';
        const percent = Number(w.weight_percent) || 0;
        const marks = Number(w.weight_marks) || 0;

        let entry = map.get(w.chapter_id);
        if (!entry) {
          entry = { module_id: w.module_id, totalPercent: 0, totalMarks: 0, byComponent: {} };
          map.set(w.chapter_id, entry);
        }
        entry.totalPercent += percent;
        entry.totalMarks += marks;

        if (!entry.byComponent[componentType]) {
          entry.byComponent[componentType] = { percent: 0, marks: 0 };
        }
        entry.byComponent[componentType].percent += percent;
        entry.byComponent[componentType].marks += marks;
      }

      // Compute dominant/secondary and study mode
      const result = new Map<string, ChapterExamWeight>();
      for (const [chapterId, entry] of map) {
        const sorted = Object.entries(entry.byComponent)
          .map(([type, vals]) => ({ type, total: vals.percent || vals.marks }))
          .sort((a, b) => b.total - a.total);

        const dominant = sorted[0]?.type ?? null;
        let secondary: string | null = null;
        if (sorted.length >= 2 && sorted[0].total > 0) {
          const ratio = sorted[1].total / sorted[0].total;
          if (ratio >= SECONDARY_THRESHOLD) {
            secondary = sorted[1].type;
          }
        }

        result.set(chapterId, {
          chapter_id: chapterId,
          module_id: entry.module_id,
          total_weight_percent: entry.totalPercent,
          total_weight_marks: entry.totalMarks,
          component_weights: entry.byComponent,
          dominant_component: dominant,
          secondary_component: secondary,
          prescribed_study_mode: getStudyMode(dominant),
        });
      }

      return result;
    },
    enabled: moduleIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Applies exam weight boosting to priority scores.
 * Supports both percent and marks modes — uses whichever is non-zero.
 */
export function getExamWeightBoost(
  chapterId: string,
  weightMap: Map<string, ChapterExamWeight> | undefined
): number {
  if (!weightMap) return 1.0;
  const w = weightMap.get(chapterId);
  if (!w) return 1.0;

  const effectiveWeight = w.total_weight_percent > 0
    ? w.total_weight_percent
    : w.total_weight_marks > 0
      ? Math.min(w.total_weight_marks, 100) // normalize marks to a 0-100ish scale
      : 0;

  if (effectiveWeight === 0) return 1.0;

  // 10% weight → 1.5x boost, 20%+ → up to 2.0x
  return Math.min(2.0, 1.0 + (effectiveWeight / 20));
}
