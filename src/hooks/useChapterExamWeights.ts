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

      if (!weights || weights.length === 0) {
        // Fallback: synthesize weights from chapter_blueprint_config (H/A/L inclusion levels)
        const { data: blueprint } = await supabase
          .from('chapter_blueprint_config')
          .select('chapter_id, module_id, component_type, inclusion_level')
          .in('module_id', moduleIds);

        if (!blueprint || blueprint.length === 0) return new Map<string, ChapterExamWeight>();

        const inclusionToMarks = (level: string): number => {
          switch ((level || '').toLowerCase()) {
            case 'high': return 30;
            case 'average': return 15;
            case 'low': return 5;
            default: return 0;
          }
        };

        const bpMap = new Map<string, {
          module_id: string;
          totalPercent: number;
          totalMarks: number;
          byComponent: Record<string, { percent: number; marks: number }>;
        }>();

        for (const b of blueprint as any[]) {
          if (!b.chapter_id) continue;
          const componentType: string = b.component_type || 'unknown';
          const marks = inclusionToMarks(b.inclusion_level);
          if (marks === 0) continue;

          let entry = bpMap.get(b.chapter_id);
          if (!entry) {
            entry = { module_id: b.module_id, totalPercent: 0, totalMarks: 0, byComponent: {} };
            bpMap.set(b.chapter_id, entry);
          }
          entry.totalMarks += marks;

          if (!entry.byComponent[componentType]) {
            entry.byComponent[componentType] = { percent: 0, marks: 0 };
          }
          entry.byComponent[componentType].marks += marks;
        }

        const bpResult = new Map<string, ChapterExamWeight>();
        for (const [chapterId, entry] of bpMap) {
          const sorted = Object.entries(entry.byComponent)
            .map(([type, vals]) => ({ type, total: vals.marks }))
            .sort((a, b) => b.total - a.total);

          const dominant = sorted[0]?.type ?? null;
          let secondary: string | null = null;
          if (sorted.length >= 2 && sorted[0].total > 0) {
            const ratio = sorted[1].total / sorted[0].total;
            if (ratio >= SECONDARY_THRESHOLD) {
              secondary = sorted[1].type;
            }
          }

          bpResult.set(chapterId, {
            chapter_id: chapterId,
            module_id: entry.module_id,
            total_weight_percent: 0,
            total_weight_marks: entry.totalMarks,
            component_weights: entry.byComponent,
            dominant_component: dominant,
            secondary_component: secondary,
            prescribed_study_mode: getStudyMode(dominant),
          });
        }

        return bpResult;
      }

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
 * Uses normalized weight: boost = 0.5 + normalized_weight * 1.5
 * Where normalized_weight = effectiveWeight / maxWeight across all chapters.
 * Chapters with no blueprint data get a medium boost (1.0).
 */
export function getExamWeightBoost(
  chapterId: string,
  weightMap: Map<string, ChapterExamWeight> | undefined
): number {
  if (!weightMap || weightMap.size === 0) return 1.0; // No blueprint → medium

  const w = weightMap.get(chapterId);
  if (!w) return 1.0; // Chapter has no blueprint data → medium fallback

  const effectiveWeight = w.total_weight_percent > 0
    ? w.total_weight_percent
    : w.total_weight_marks > 0
      ? Math.min(w.total_weight_marks, 100)
      : 0;

  if (effectiveWeight === 0) return 0.5; // Explicitly zero weight → low priority

  // Find max weight across all chapters for normalization
  let maxWeight = 0;
  for (const entry of weightMap.values()) {
    const ew = entry.total_weight_percent > 0
      ? entry.total_weight_percent
      : entry.total_weight_marks > 0
        ? Math.min(entry.total_weight_marks, 100)
        : 0;
    if (ew > maxWeight) maxWeight = ew;
  }

  const normalizedWeight = maxWeight > 0 ? effectiveWeight / maxWeight : 0.5;
  return 0.5 + normalizedWeight * 1.5; // Range: 0.5 to 2.0
}
