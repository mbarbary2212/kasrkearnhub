// Structured Essay Rubric Types — v1

export interface RubricConcept {
  label: string;
  description?: string;
  is_critical?: boolean;
  acceptable_phrases?: string[];
}

export interface StructuredRubric {
  rubric_version: number;
  expected_points: number;
  required_concepts: RubricConcept[];
  optional_concepts: RubricConcept[];
  grading_notes?: string;
  model_structure?: string[];
  rubric_source: 'admin' | 'ai';
  rubric_status: 'draft' | 'approved' | 'needs_review';
  // Legacy fields preserved for backward compat
  pass_threshold?: number;
  critical_omissions?: string[];
  acceptable_phrases?: Record<string, string[]>;
}

export interface GradingResult {
  score: number;
  max_score: number;
  percentage: number;
  matched_points: string[];
  missed_points: string[];
  missing_critical_points: string[];
  confidence_score: number;
  feedback: string;
}

/**
 * Parse any rubric_json (old flat format or new structured) into StructuredRubric.
 * Old format: { required_concepts: string[], optional_concepts: string[], ... }
 * New format: { rubric_version: 1, required_concepts: RubricConcept[], ... }
 */
export function parseRubric(rubricJson: unknown): StructuredRubric | null {
  if (!rubricJson || typeof rubricJson !== 'object') return null;

  const r = rubricJson as Record<string, unknown>;

  // Already new format
  if (r.rubric_version === 1 && Array.isArray(r.required_concepts)) {
    return r as unknown as StructuredRubric;
  }

  // Convert old flat format
  if (Array.isArray(r.required_concepts)) {
    const isStringArray = r.required_concepts.length === 0 || typeof r.required_concepts[0] === 'string';

    const required: RubricConcept[] = isStringArray
      ? (r.required_concepts as string[]).map(label => ({ label }))
      : (r.required_concepts as RubricConcept[]);

    const optional: RubricConcept[] = Array.isArray(r.optional_concepts)
      ? (typeof r.optional_concepts[0] === 'string'
        ? (r.optional_concepts as string[]).map(label => ({ label }))
        : (r.optional_concepts as RubricConcept[]))
      : [];

    // Map critical_omissions into required concepts with is_critical flag
    const criticalOmissions = Array.isArray(r.critical_omissions) ? r.critical_omissions as string[] : [];
    const criticalConcepts: RubricConcept[] = criticalOmissions
      .filter(c => !required.some(rc => rc.label.toLowerCase() === c.toLowerCase()))
      .map(label => ({ label, is_critical: true }));

    // Mark existing required concepts as critical if they match critical_omissions
    const allRequired = required.map(rc => ({
      ...rc,
      is_critical: rc.is_critical || criticalOmissions.some(co => co.toLowerCase() === rc.label.toLowerCase()),
    }));

    return {
      rubric_version: 1,
      expected_points: typeof r.expected_points === 'number' ? r.expected_points : allRequired.length + criticalConcepts.length,
      required_concepts: [...allRequired, ...criticalConcepts],
      optional_concepts: optional,
      grading_notes: typeof r.grading_notes === 'string' ? r.grading_notes : '',
      model_structure: Array.isArray(r.model_structure) ? r.model_structure as string[] : [],
      rubric_source: (r.rubric_source as 'admin' | 'ai') || 'ai',
      rubric_status: (r.rubric_status as 'draft' | 'approved' | 'needs_review') || 'draft',
      pass_threshold: typeof r.pass_threshold === 'number' ? r.pass_threshold : 60,
      acceptable_phrases: (r.acceptable_phrases && typeof r.acceptable_phrases === 'object')
        ? r.acceptable_phrases as Record<string, string[]>
        : {},
    };
  }

  return null;
}

/**
 * Get the number of expected points from a rubric.
 * Returns expected_points if set, otherwise required_concepts count.
 */
export function getExpectedPoints(rubricJson: unknown): number | null {
  const rubric = parseRubric(rubricJson);
  if (!rubric) return null;
  if (rubric.expected_points > 0) return rubric.expected_points;
  if (rubric.required_concepts.length > 0) return rubric.required_concepts.length;
  return null;
}

/**
 * Convert StructuredRubric back to JSON for storage.
 */
export function rubricToJson(rubric: StructuredRubric): Record<string, unknown> {
  return { ...rubric };
}
