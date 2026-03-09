// Structured Interactive Case Types

// ── Enums ──────────────────────────────────────────────

export type HistoryMode =
  | 'full_conversation'
  | 'paramedic_handover'
  | 'triage_note'
  | 'witness_account'
  | 'no_history';

export type DeliveryMode = 'practice' | 'exam';

export type PatientLanguage = 'en' | 'ar_eg';

export type SectionType =
  | 'history_taking'
  | 'physical_examination'
  | 'investigations_labs'
  | 'investigations_imaging'
  | 'diagnosis'
  | 'medical_management'
  | 'surgical_management'
  | 'monitoring_followup'
  | 'patient_family_advice'
  | 'conclusion';

export const SECTION_LABELS: Record<SectionType, string> = {
  history_taking: 'History Taking',
  physical_examination: 'Physical Examination',
  investigations_labs: 'Investigations — Labs',
  investigations_imaging: 'Investigations — Imaging',
  diagnosis: 'Diagnosis',
  medical_management: 'Medical Management',
  surgical_management: 'Surgical Management',
  monitoring_followup: 'Monitoring & Follow-up',
  patient_family_advice: 'Patient & Family Advice',
  conclusion: 'Conclusion',
};

/** Maps the 10 detail sections into 5 exam-aligned summary categories */
export const SUMMARY_CATEGORY_MAP: Record<string, SectionType[]> = {
  'Professional Attitude': [], // scored holistically, not section-tied
  'History Taking': ['history_taking'],
  'Physical Examination': ['physical_examination'],
  'Investigations': ['investigations_labs', 'investigations_imaging'],
  'Diagnosis & Management': [
    'diagnosis',
    'medical_management',
    'surgical_management',
    'monitoring_followup',
    'patient_family_advice',
    'conclusion',
  ],
};

// ── Checklist Items ────────────────────────────────────

export interface ChecklistItem {
  key: string;
  label: string;
  label_ar?: string;
  expected_behaviour?: string;
}

// ── History Checklist Categories (A–E) ─────────────────

export interface HistoryCategory {
  key: string;
  label: string;
  label_ar?: string;
  items: ChecklistItem[];
}

// ── Professional Attitude ──────────────────────────────

export interface ProfessionalAttitude {
  max_score: number;
  items: ChecklistItem[];
  scoring_note: string;
}

// ── ATMIST Handover ────────────────────────────────────

export interface AtmistHandover {
  age_time: string;
  mechanism: string;
  injuries: string;
  signs: string;
  treatment: string;
}

// ── Comprehension Question ─────────────────────────────

export interface ComprehensionQuestion {
  id: string;
  question: string;
  correct_answer: string;
  points: number;
}

// ── Section-specific data within generated_case_data ───

export interface HistorySectionData {
  mode: HistoryMode;
  max_score: number;
  atmist_handover?: AtmistHandover;
  checklist: HistoryCategory[];
  comprehension_questions: ComprehensionQuestion[];
  arabic_reference?: string;
  english_reference?: string;
  available_languages?: string[];
}

// ── Physical Examination ───────────────────────────────

/** Legacy region format (backward compat) */
export interface ExamRegion {
  label: string;
  finding: string;
}

/** Fixed set of anatomical region keys for v8 */
export type RegionKey =
  | 'general'
  | 'head_neck'
  | 'vital_signs'
  | 'chest'
  | 'upper_limbs'
  | 'abdomen'
  | 'lower_limbs'
  | 'extra';

export interface VitalSign {
  name: string;
  value: string;
  unit: string;
  abnormal: boolean;
}

export interface RegionFinding {
  text: string;
  ref?: string | null;
}

export interface VitalsFinding {
  vitals: VitalSign[];
  text?: string;
  ref?: string | null;
}

export interface ExtraFinding extends RegionFinding {
  label: string;
}

export interface TopicItem {
  key: string;
  label: string;
  title: string;
  chapter: string;
  body: string;
  quote: string;
}

export type ExamFindingValue = RegionFinding | VitalsFinding | ExtraFinding;

export interface PhysicalExamSectionData {
  max_score: number;
  note?: string;
  findings: Partial<Record<RegionKey, ExamFindingValue>>;
  related_topics?: TopicItem[];
  /** @deprecated backward compat with old cases */
  regions?: Record<string, ExamRegion>;
}

// ── Lab Investigations ─────────────────────────────────

export interface LabTest {
  label: string;
  result: string;
  interpretation: string;
  is_key: boolean;
  points: number;
}

export interface LabsSectionData {
  max_score: number;
  key_tests: string[];
  available_tests: Record<string, LabTest>;
}

// ── Imaging Investigations ─────────────────────────────

export interface ImagingStudy {
  label: string;
  result: string;
  interpretation: string;
  is_key: boolean;
  points: number;
}

export interface ImagingSectionData {
  max_score: number;
  key_investigations: string[];
  available_imaging: Record<string, ImagingStudy>;
}

// ── Diagnosis ──────────────────────────────────────────

export interface DiagnosisRubricItem {
  label: string;
  expected?: string[] | string;
  expected_top?: string;
  reasoning_points?: string[];
  points: number;
  model_answer: string;
}

export interface DiagnosisSectionData {
  max_score: number;
  rubric: {
    possible_diagnosis: DiagnosisRubricItem;
    differential_diagnosis: DiagnosisRubricItem;
    final_diagnosis: DiagnosisRubricItem;
  };
}

// ── Management (Medical / Surgical) ────────────────────

export interface ManagementQuestion {
  id: string;
  type: 'mcq' | 'free_text';
  question: string;
  options?: string[];
  correct?: string;
  explanation?: string;
  points: number;
  rubric?: {
    expected_points: string[];
    model_answer: string;
    points: number;
  };
}

export interface ManagementSectionData {
  max_score: number;
  questions: ManagementQuestion[];
}

// ── Monitoring & Follow-up ─────────────────────────────

export interface RubricSection {
  expected_points: string[];
  model_answer: string;
  points: number;
}

export interface MonitoringSectionData {
  max_score: number;
  question: string;
  rubric: RubricSection;
}

// ── Patient & Family Advice ────────────────────────────

export interface AdviceSectionData {
  max_score: number;
  question: string;
  rubric: RubricSection;
}

// ── Conclusion ─────────────────────────────────────────

export interface ConclusionTask {
  id: string;
  type: 'ward_round_presentation' | 'key_decision' | 'learning_point';
  label: string;
  instruction: string;
  rubric: {
    expected_structure?: string[];
    expected_answer?: string;
    expected_points?: string[];
    model_answer: string;
    points: number;
  };
}

export interface ConclusionSectionData {
  max_score: number;
  tasks: ConclusionTask[];
}

// ── Full generated_case_data JSONB shape ───────────────

export interface StructuredCaseData {
  case_meta?: any;
  patient?: any;
  history_taking?: HistorySectionData;
  physical_examination?: PhysicalExamSectionData;
  investigations_labs?: LabsSectionData;
  investigations_imaging?: ImagingSectionData;
  diagnosis?: DiagnosisSectionData;
  medical_management?: ManagementSectionData;
  surgical_management?: ManagementSectionData;
  monitoring_followup?: MonitoringSectionData;
  patient_family_advice?: AdviceSectionData;
  conclusion?: ConclusionSectionData;
  professional_attitude?: ProfessionalAttitude;
  score_summary?: any;
}

// ── Reference Documents ────────────────────────────────

export type DocCategory = 'checklist' | 'lecture' | 'guideline' | 'general';
export type FileType = 'pdf' | 'docx';

export interface CaseReferenceDocument {
  id: string;
  case_id: string | null;
  chapter_id: string | null;
  title: string;
  file_url: string;
  extracted_text: string | null;
  file_type: FileType;
  doc_category: DocCategory;
  uploaded_by: string | null;
  created_at: string;
}

// ── Section Answers (student responses) ────────────────

export interface CaseSectionAnswer {
  id: string;
  attempt_id: string;
  section_type: SectionType;
  student_answer: Record<string, unknown> | null;
  score: number | null;
  max_score: number | null;
  ai_feedback: string | null;
  is_scored: boolean;
  created_at: string;
}

// ── Admin form for creating a structured case ──────────

export interface StructuredCaseFormData {
  // Tab 1 — Basics
  title: string;
  chief_complaint: string;
  module_id: string;
  chapter_id?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimated_minutes: number;
  additional_instructions?: string;
  tags: string[];

  // Tab 2 — Sections
  active_sections: SectionType[];
  section_question_counts: Partial<Record<SectionType, number>>;

  // Tab 3 — History Mode
  history_mode: HistoryMode;
  patient_language: PatientLanguage;

  // Tab 4 — Patient
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  avatar_id: number;
  delivery_mode: DeliveryMode;
  history_interaction_mode?: 'text' | 'voice';

  // Tab 5 — Review (no additional fields)
}
