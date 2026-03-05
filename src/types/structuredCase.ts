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
  category_key: string; // e.g. 'personal_history'
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

// ── Section-specific data within generated_case_data ───

export interface HistorySectionData {
  patient_profile: {
    name: string;
    age: number;
    gender: string;
    occupation?: string;
    avatar_id?: number;
  };
  system_prompt: string;
  categories: HistoryCategory[];
  max_score: number;
}

export interface ExamFinding {
  region: string;
  finding: string;
  finding_ar?: string;
  is_abnormal: boolean;
}

export interface PhysicalExamSectionData {
  findings: ExamFinding[];
  max_score: number;
}

export interface LabItem {
  test_name: string;
  test_name_ar?: string;
  result: string;
  unit: string;
  reference_range: string;
  is_abnormal: boolean;
}

export interface LabsSectionData {
  available_labs: LabItem[];
  expected_orders: string[];
  max_score: number;
}

export interface ImagingItem {
  modality: string;
  modality_ar?: string;
  body_part: string;
  finding: string;
  finding_ar?: string;
  image_url?: string;
}

export interface ImagingSectionData {
  available_imaging: ImagingItem[];
  expected_orders: string[];
  max_score: number;
}

export interface McqOption {
  key: string;
  text: string;
  text_ar?: string;
  is_correct: boolean;
  explanation?: string;
}

export interface McqQuestion {
  question: string;
  question_ar?: string;
  options: McqOption[];
}

export interface DiagnosisSectionData {
  expected_diagnosis: string;
  differential_diagnoses: string[];
  max_score: number;
}

export interface ManagementSectionData {
  mcqs: McqQuestion[];
  free_text_prompt?: string;
  free_text_prompt_ar?: string;
  expected_answer?: string;
  max_score: number;
}

export interface MonitoringSectionData {
  prompt: string;
  prompt_ar?: string;
  expected_answer: string;
  max_score: number;
}

export interface AdviceSectionData {
  prompt: string;
  prompt_ar?: string;
  expected_answer: string;
  max_score: number;
}

export interface ConclusionSectionData {
  ward_round_prompt: string;
  ward_round_prompt_ar?: string;
  key_decisions: string[];
  max_score: number;
}

// ── Full generated_case_data JSONB shape ───────────────

export interface StructuredCaseData {
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
  professional_attitude: ProfessionalAttitude;
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

  // Tab 5 — Review (no additional fields)
}
