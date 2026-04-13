/**
 * Algorithm v1 — Chapter Performance Classifier
 *
 * Classifies chapters into Strength / Weakness / Needs Improvement / Review Due
 * using ONLY existing student_chapter_metrics fields.
 */

export interface ChapterMetricRow {
  student_id: string;
  module_id: string;
  chapter_id: string;
  readiness_score: number | null;
  recent_mcq_accuracy: number | null;
  mcq_attempts: number | null;
  next_review_at: string | null;
  overconfident_error_rate: number | null;
}

export type ChapterCategory = 'strength' | 'emerging_strength' | 'weakness' | 'needs_improvement' | 'unclassified';

export interface ClassifiedChapter {
  chapter_id: string;
  module_id: string;
  category: ChapterCategory;
  review_due: boolean;
  readiness_score: number;
  recent_mcq_accuracy: number;
  mcq_attempts: number;
  next_review_at: string | null;
  overconfident_error_rate: number;
  /** Populated post-classification from exam weight data */
  total_exam_weight?: number;
  dominant_component?: string | null;
  secondary_component?: string | null;
  prescribed_study_mode?: import('@/lib/studyModes').StudyMode;
}

export interface ModuleClassification {
  module_id: string;
  strengths: ClassifiedChapter[];
  emerging_strengths: ClassifiedChapter[];
  weaknesses: ClassifiedChapter[];
  improve: ClassifiedChapter[];
  review_due: ClassifiedChapter[];
  unclassified: ClassifiedChapter[];
}

// ─── Thresholds ────────────────────────────────────────────────

const MIN_ATTEMPTS_FOR_WEAKNESS = 5;

const WEAKNESS = {
  accuracy_below: 55,
  overconfident_above: 25,
} as const;

const STRENGTH = {
  readiness_min: 75,
  accuracy_min: 70,
} as const;

const EMERGING_STRENGTH = {
  readiness_min: 60,
  accuracy_min: 75,
} as const;

const NEEDS_IMPROVEMENT = {
  readiness_low: 50,
  readiness_high: 75,
  accuracy_low: 55,
  accuracy_high: 70,
} as const;

// ─── Classification Logic ──────────────────────────────────────

function isWeakness(row: ChapterMetricRow): boolean {
  const attempts = row.mcq_attempts ?? 0;
  if (attempts < MIN_ATTEMPTS_FOR_WEAKNESS) return false;

  const accuracy = row.recent_mcq_accuracy ?? 0;
  const overconfident = row.overconfident_error_rate ?? 0;

  return (
    accuracy < WEAKNESS.accuracy_below ||
    (overconfident > 0 && overconfident >= WEAKNESS.overconfident_above)
  );
}

function isStrength(row: ChapterMetricRow): boolean {
  const readiness = row.readiness_score ?? 0;
  const accuracy = row.recent_mcq_accuracy ?? 0;
  return readiness >= STRENGTH.readiness_min && accuracy >= STRENGTH.accuracy_min;
}

function isEmergingStrength(row: ChapterMetricRow): boolean {
  const readiness = row.readiness_score ?? 0;
  const accuracy = row.recent_mcq_accuracy ?? 0;
  return readiness >= EMERGING_STRENGTH.readiness_min && accuracy >= EMERGING_STRENGTH.accuracy_min;
}

function isNeedsImprovement(row: ChapterMetricRow): boolean {
  const readiness = row.readiness_score ?? 0;
  const accuracy = row.recent_mcq_accuracy ?? 0;

  const readinessInBand =
    readiness >= NEEDS_IMPROVEMENT.readiness_low &&
    readiness < NEEDS_IMPROVEMENT.readiness_high;

  const accuracyInBand =
    accuracy >= NEEDS_IMPROVEMENT.accuracy_low &&
    accuracy < NEEDS_IMPROVEMENT.accuracy_high;

  return readinessInBand || accuracyInBand;
}

function isReviewDue(row: ChapterMetricRow): boolean {
  if (!row.next_review_at) return false;
  return new Date(row.next_review_at) <= new Date();
}

function isClassifiable(row: ChapterMetricRow): boolean {
  return row.readiness_score != null;
}

// ─── Single-row classifier ────────────────────────────────────

/**
 * @deprecated Use classifyFromMetrics() from '@/lib/readiness' instead.
 */
export function classifyChapter(row: ChapterMetricRow): ClassifiedChapter {
  const base: Omit<ClassifiedChapter, 'category' | 'review_due'> = {
    chapter_id: row.chapter_id,
    module_id: row.module_id,
    readiness_score: row.readiness_score ?? 0,
    recent_mcq_accuracy: row.recent_mcq_accuracy ?? 0,
    mcq_attempts: row.mcq_attempts ?? 0,
    next_review_at: row.next_review_at,
    overconfident_error_rate: row.overconfident_error_rate ?? 0,
  };

  const reviewDue = isReviewDue(row);

  if (!isClassifiable(row)) {
    return { ...base, category: 'unclassified', review_due: reviewDue };
  }

  // Priority: Weakness > Strength > Emerging Strength > Needs Improvement > Unclassified
  let category: ChapterCategory = 'unclassified';

  if (isWeakness(row)) {
    category = 'weakness';
  } else if (isStrength(row)) {
    category = 'strength';
  } else if (isEmergingStrength(row)) {
    category = 'emerging_strength';
  } else if (isNeedsImprovement(row)) {
    category = 'needs_improvement';
  }

  return { ...base, category, review_due: reviewDue };
}

// ─── Module-level aggregation ──────────────────────────────────

/**
 * @deprecated Use readiness engine for module-level aggregation.
 */
export function classifyByModule(rows: ChapterMetricRow[]): ModuleClassification[] {
  const classified = rows.map(classifyChapter);

  // Group by module
  const moduleMap = new Map<string, ClassifiedChapter[]>();
  for (const ch of classified) {
    const list = moduleMap.get(ch.module_id) || [];
    list.push(ch);
    moduleMap.set(ch.module_id, list);
  }

  const results: ModuleClassification[] = [];

  for (const [module_id, chapters] of moduleMap) {
    const strengths = chapters
      .filter(c => c.category === 'strength')
      .sort((a, b) => b.readiness_score - a.readiness_score)
      .slice(0, 3);

    const emerging_strengths = chapters
      .filter(c => c.category === 'emerging_strength')
      .sort((a, b) => b.readiness_score - a.readiness_score)
      .slice(0, 3);

    const weaknesses = chapters
      .filter(c => c.category === 'weakness')
      .sort((a, b) => a.recent_mcq_accuracy - b.recent_mcq_accuracy)
      .slice(0, 3);

    const improve = chapters
      .filter(c => c.category === 'needs_improvement')
      .sort((a, b) => a.readiness_score - b.readiness_score)
      .slice(0, 3);

    const review_due = chapters
      .filter(c => c.review_due)
      .sort((a, b) => {
        const da = a.next_review_at ? new Date(a.next_review_at).getTime() : Infinity;
        const db = b.next_review_at ? new Date(b.next_review_at).getTime() : Infinity;
        return da - db;
      });

    const unclassified = chapters.filter(c => c.category === 'unclassified');

    results.push({ module_id, strengths, emerging_strengths, weaknesses, improve, review_due, unclassified });
  }

  return results;
}
