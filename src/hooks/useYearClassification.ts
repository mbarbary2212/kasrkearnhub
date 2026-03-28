import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classifyByModule, type ChapterMetricRow, type ModuleClassification, type ClassifiedChapter } from '@/lib/classifyChapters';
import { type ChapterExamWeight, getExamWeightBoost } from './useChapterExamWeights';
import { getStudyMode } from '@/lib/studyModes';

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

/**
 * Enriches classified chapters with exam weight data.
 */
function enrichWithWeights(
  chapters: ClassifiedChapter[],
  weightMap?: Map<string, ChapterExamWeight>
): void {
  if (!weightMap) return;
  for (const ch of chapters) {
    const w = weightMap.get(ch.chapter_id);
    if (w) {
      ch.total_exam_weight = w.total_weight_percent || w.total_weight_marks;
      ch.dominant_component = w.dominant_component;
      ch.secondary_component = w.secondary_component;
      ch.prescribed_study_mode = w.prescribed_study_mode;
    }
  }
}

function mergeClassifications(
  modules: ModuleClassification[],
  weightMap?: Map<string, ChapterExamWeight>
): AggregatedClassification {
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

  const boost = (ch: ClassifiedChapter) => getExamWeightBoost(ch.chapter_id, weightMap);

  // Light engagement factor: under-practiced chapters get a small nudge
  const engagementFactor = (ch: ClassifiedChapter) => ch.mcq_attempts < 3 ? 1.15 : 1.0;

  // Review urgency: overdue = 1.5, due today = 1.2, else 1.0
  const reviewUrgency = (ch: ClassifiedChapter) => {
    if (!ch.next_review_at) return 1.0;
    const diff = Date.now() - new Date(ch.next_review_at).getTime();
    if (diff > 86400000) return 1.5; // overdue by > 1 day
    if (diff >= 0) return 1.2; // due today
    return 1.0;
  };

  // Weaknesses: lower effective score = higher priority
  allWeaknesses.sort((a, b) => {
    const scoreA = a.recent_mcq_accuracy / (boost(a) * engagementFactor(a) * reviewUrgency(a));
    const scoreB = b.recent_mcq_accuracy / (boost(b) * engagementFactor(b) * reviewUrgency(b));
    return scoreA - scoreB;
  });

  allReviewDue.sort((a, b) => {
    const da = a.next_review_at ? new Date(a.next_review_at).getTime() : Infinity;
    const db = b.next_review_at ? new Date(b.next_review_at).getTime() : Infinity;
    const timeDiff = da - db;
    if (Math.abs(timeDiff) < 86400000) {
      return boost(b) - boost(a);
    }
    return timeDiff;
  });

  allImprove.sort((a, b) => {
    const scoreA = a.readiness_score / (boost(a) * engagementFactor(a));
    const scoreB = b.readiness_score / (boost(b) * engagementFactor(b));
    return scoreA - scoreB;
  });

  allEmerging.sort((a, b) => b.readiness_score - a.readiness_score);
  allStrengths.sort((a, b) => b.readiness_score - a.readiness_score);

  // Deduplicate
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

  // Enrich all picked chapters with weight data
  enrichWithWeights([...weaknesses, ...review_due, ...improve, ...emerging_strengths, ...strengths], weightMap);

  return { strengths, emerging_strengths, weaknesses, improve, review_due };
}

/**
 * Fetches classification data across ALL modules for a year.
 */
export function useYearClassification(userId: string | undefined, moduleIds: string[]) {
  return useQuery<YearClassificationData | null>({
    queryKey: ['year-classification', userId, moduleIds],
    queryFn: async () => {
      if (!userId || moduleIds.length === 0) return null;

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

      // Fetch exam weights with per-component data
      const { data: activeAssessments } = await supabase
        .from('assessment_structures')
        .select('id, module_id')
        .in('module_id', moduleIds)
        .eq('is_active', true);

      let weightMap: Map<string, ChapterExamWeight> | undefined;
      if (activeAssessments && activeAssessments.length > 0) {
        const { data: weights } = await supabase
          .from('topic_exam_weights')
          .select('chapter_id, module_id, weight_percent, weight_marks, component_id, assessment_components!inner(component_type)')
          .in('assessment_id', activeAssessments.map(a => a.id))
          .not('chapter_id', 'is', null)
          .not('component_id', 'is', null);

        if (weights && weights.length > 0) {
          weightMap = new Map();
          for (const w of weights as any[]) {
            if (!w.chapter_id) continue;
            const componentType: string = w.assessment_components?.component_type || 'unknown';
            const percent = Number(w.weight_percent) || 0;
            const marks = Number(w.weight_marks) || 0;

            let entry = weightMap.get(w.chapter_id);
            if (!entry) {
              entry = {
                chapter_id: w.chapter_id,
                module_id: w.module_id,
                total_weight_percent: 0,
                total_weight_marks: 0,
                component_weights: {},
                dominant_component: null,
                secondary_component: null,
                prescribed_study_mode: getStudyMode(null),
              };
              weightMap.set(w.chapter_id, entry);
            }
            entry.total_weight_percent += percent;
            entry.total_weight_marks += marks;

            if (!entry.component_weights[componentType]) {
              entry.component_weights[componentType] = { percent: 0, marks: 0 };
            }
            entry.component_weights[componentType].percent += percent;
            entry.component_weights[componentType].marks += marks;
          }

          // Compute dominant/secondary for each entry
          for (const entry of weightMap.values()) {
            const sorted = Object.entries(entry.component_weights)
              .map(([type, vals]) => ({ type, total: vals.percent || vals.marks }))
              .sort((a, b) => b.total - a.total);

            entry.dominant_component = sorted[0]?.type ?? null;
            if (sorted.length >= 2 && sorted[0].total > 0) {
              if (sorted[1].total / sorted[0].total >= 0.7) {
                entry.secondary_component = sorted[1].type;
              }
            }
            entry.prescribed_study_mode = getStudyMode(entry.dominant_component);
          }
        }
      }

      const moduleClassifications = classifyByModule(rows);
      const classification = mergeClassifications(moduleClassifications, weightMap);

      // Fetch chapter titles
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
