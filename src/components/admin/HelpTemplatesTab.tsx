import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  BookOpen, 
  FileSpreadsheet,
  Loader2,
  Plus,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { writeArrayToExcel } from '@/lib/excel';

interface AdminHelpFile {
  id: string;
  category: 'guide' | 'template';
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  template_type: string | null;
  display_order: number;
  created_at: string;
}

// Centralized Template Schema System - Single source of truth for all templates
interface TemplateSchema {
  columns: string[];
  required: string[];
  optional: string[];
  examples: string[][];
}

export const TEMPLATE_SCHEMAS: Record<string, TemplateSchema> = {
  mcq: {
    columns: ['stem', 'choiceA', 'choiceB', 'choiceC', 'choiceD', 'choiceE', 'correct_key', 'explanation', 'difficulty', 'section_name', 'section_number', 'ai_confidence'],
    required: ['stem', 'choiceA', 'choiceB', 'correct_key'],
    optional: ['choiceC', 'choiceD', 'choiceE', 'explanation', 'difficulty', 'section_name', 'section_number', 'ai_confidence'],
    examples: [
      [
        'A 45-year-old patient presents with chest pain radiating to the left arm. Which of the following is the most likely diagnosis?',
        'Acute myocardial infarction',
        'Gastroesophageal reflux disease',
        'Costochondritis',
        'Pulmonary embolism',
        'Aortic dissection',
        'A',
        'The classic presentation of chest pain radiating to the left arm is highly suggestive of acute myocardial infarction.',
        'medium',
        'Cardiac Emergencies',
        '1',
        '8'
      ],
    ],
  },
  osce: {
    columns: ['image_filename', 'history_text', 'statement_1', 'answer_1', 'explanation_1', 'statement_2', 'answer_2', 'explanation_2', 'statement_3', 'answer_3', 'explanation_3', 'statement_4', 'answer_4', 'explanation_4', 'statement_5', 'answer_5', 'explanation_5', 'section_name', 'section_number', 'ai_confidence'],
    required: ['image_filename', 'history_text', 'statement_1', 'answer_1'],
    optional: ['explanation_1', 'statement_2', 'answer_2', 'explanation_2', 'statement_3', 'answer_3', 'explanation_3', 'statement_4', 'answer_4', 'explanation_4', 'statement_5', 'answer_5', 'explanation_5', 'section_name', 'section_number', 'ai_confidence'],
    examples: [
      [
        'chest_xray_001.jpg',
        'A 65-year-old male presents with progressive dyspnea and chronic cough. He has a 40-pack-year smoking history.',
        'The image shows hyperinflation of the lungs',
        'TRUE',
        'Hyperinflation is a classic finding in COPD/emphysema.',
        'There is evidence of consolidation in the right lower lobe',
        'FALSE',
        'No consolidation is visible in this image.',
        'The heart size is enlarged',
        'FALSE',
        'The heart appears normal in size.',
        'Flattening of the diaphragm is present',
        'TRUE',
        'Diaphragmatic flattening indicates air trapping.',
        'This is consistent with pneumonia',
        'FALSE',
        'The findings are more consistent with COPD/emphysema.',
        'Radiology',
        '2',
        '7'
      ],
    ],
  },
  flashcard: {
    columns: ['title', 'front', 'back', 'section_name', 'section_number'],
    required: ['title', 'front', 'back'],
    optional: ['section_name', 'section_number'],
    examples: [
      ['Cardiac Physiology', 'What is the normal ejection fraction?', '55-70%', 'Heart Basics', '1'],
      ['Cardiac Anatomy', 'Name the 4 chambers of the heart', 'Left/Right Atrium, Left/Right Ventricle', 'Heart Basics', '1'],
    ],
  },
  cloze_flashcard: {
    columns: ['text', 'extra', 'tags', 'section_name', 'section_number'],
    required: ['text'],
    optional: ['extra', 'tags', 'section_name', 'section_number'],
    examples: [
      ['Second degree burns involve the epidermis and a portion of the {{c1::dermis}}.', 'Blisters are a common clinical sign.', 'Burns Classification', 'Burns', '1'],
      ['The gold standard biomarker for myocardial infarction is {{c1::troponin}}.', 'Troponin I or T; rises 3-6 hours after onset.', 'MI Diagnosis', 'Cardiology', '2'],
    ],
  },
  table: {
    columns: ['title', 'headers', 'row1', 'row2', 'row3', 'section_name', 'section_number'],
    required: ['title', 'headers', 'row1'],
    optional: ['row2', 'row3', 'section_name', 'section_number'],
    examples: [
      [
        'Types of Shock',
        'Type|Mechanism|Key Finding',
        'Cardiogenic|Pump failure|Elevated JVP',
        'Hypovolemic|Volume loss|Flat JVP',
        'Distributive|Vasodilation|Warm extremities',
        'Shock Types',
        '3'
      ],
    ],
  },
  algorithm: {
    columns: ['title', 'steps (step_title::step_description, pipe-separated)', 'section_name', 'section_number'],
    required: ['title', 'steps'],
    optional: ['section_name', 'section_number'],
    examples: [
      [
        'Chest Pain Workup',
        'Obtain ECG::Order 12-lead ECG within 10 minutes of arrival|Check troponins::Serial troponin I at 0 and 3 hours|Assess HEART score::Calculate using history, ECG, age, risk factors, troponin|Consider stress testing::If low-risk by HEART score',
        'Cardiac Emergencies',
        '1'
      ],
    ],
  },
  exam_tip: {
    columns: ['title', 'tips', 'section_name', 'section_number'],
    required: ['title', 'tips'],
    optional: ['section_name', 'section_number'],
    examples: [
      [
        'MI Mnemonic',
        'MONA: Morphine, Oxygen, Nitrates, Aspirin|Remember: Give aspirin first!|ECG changes: ST elevation = STEMI',
        'Cardiology Tips',
        '1'
      ],
    ],
  },
  matching: {
    columns: ['title', 'itemA_1', 'itemB_1', 'itemA_2', 'itemB_2', 'itemA_3', 'itemB_3', 'itemA_4', 'itemB_4', 'section_name', 'section_number', 'ai_confidence'],
    required: ['title', 'itemA_1', 'itemB_1', 'itemA_2', 'itemB_2'],
    optional: ['itemA_3', 'itemB_3', 'itemA_4', 'itemB_4', 'section_name', 'section_number', 'ai_confidence'],
    examples: [
      [
        'Heart Sounds',
        'S3 gallop',
        'Volume overload',
        'S4 gallop',
        'Stiff ventricle',
        'Loud P2',
        'Pulmonary hypertension',
        'Fixed split S2',
        'ASD',
        'Auscultation',
        '2'
      ],
    ],
  },
  essay: {
    columns: ['title', 'question', 'model_answer', 'keywords', 'rating', 'section_name', 'section_number', 'question_type', 'rubric_json', 'max_points', 'ai_confidence'],
    required: ['title', 'question'],
    optional: ['model_answer', 'keywords', 'rating', 'section_name', 'section_number', 'question_type', 'rubric_json', 'max_points', 'ai_confidence'],
    examples: [
      [
        'Stages of Wound Healing',
        'Outline the four main stages of wound healing and their key features.',
        '1) Hemostasis -- platelet aggregation and clot formation. 2) Inflammation -- neutrophils and macrophages clear debris. 3) Proliferation -- fibroblast activity, granulation tissue, angiogenesis. 4) Remodeling -- collagen maturation and scar formation over weeks to months.',
        'hemostasis|inflammation|proliferation|remodeling',
        '10',
        'Pathology Basics',
        '1',
        'Essay',
        '{"required_concepts":["hemostasis","inflammation","proliferation","remodeling"],"optional_concepts":["angiogenesis"],"pass_threshold":0.6}',
        '10'
      ],
      [
        'Functions of the Liver',
        'List five major metabolic functions of the liver.',
        '1) Glycogen storage and gluconeogenesis. 2) Bile production for fat digestion. 3) Protein synthesis (albumin, clotting factors). 4) Detoxification of drugs and toxins. 5) Urea synthesis from ammonia.',
        'glycogen|bile|protein synthesis|detoxification|urea',
        '15',
        'GI Physiology',
        '2',
        '',
        '',
        ''
      ],
    ],
  },
  true_false: {
    columns: ['statement', 'correct_answer', 'explanation', 'difficulty', 'section_name', 'section_number', 'ai_confidence'],
    required: ['statement', 'correct_answer'],
    optional: ['explanation', 'difficulty', 'section_name', 'section_number', 'ai_confidence'],
    examples: [
      [
        'The left recurrent laryngeal nerve loops around the aortic arch before ascending to the larynx.',
        'TRUE',
        'The left recurrent laryngeal nerve hooks around the aortic arch (ligamentum arteriosum), while the right hooks around the subclavian artery.',
        'medium',
        'Head and Neck Anatomy',
        '1'
      ],
      [
        'Insulin is secreted by alpha cells of the pancreatic islets.',
        'FALSE',
        'Insulin is secreted by beta cells. Alpha cells secrete glucagon.',
        'easy',
        'Endocrine Physiology',
        '2'
      ],
    ],
  },
  guided_explanation: {
    columns: ['title', 'topic', 'introduction', 'questions (Q::Hint::Answer, pipe-separated)', 'summary', 'key_takeaways (pipe-separated)', 'section_name', 'section_number'],
    required: ['title', 'topic', 'questions'],
    optional: ['introduction', 'summary', 'key_takeaways', 'section_name', 'section_number'],
    examples: [
      [
        'Wound Healing Phases',
        'Wound healing',
        'Understanding the sequential phases of wound healing is essential for surgical practice.',
        'What is the first phase of wound healing?::Think about what stops bleeding::Hemostasis – platelet plug and fibrin clot formation|What happens during inflammation?::Consider the immune response::Neutrophils and macrophages clear debris and prevent infection|What characterizes the proliferative phase?::Think about tissue rebuilding::Fibroblast activity, granulation tissue formation, and angiogenesis',
        'Wound healing proceeds through hemostasis, inflammation, proliferation, and remodeling phases.',
        'Hemostasis is the immediate response|Inflammation clears debris|Proliferation rebuilds tissue|Remodeling strengthens the scar',
        'Pathology Basics',
        '1'
      ],
    ],
  },
  user_invite: {
    columns: ['full_name', 'email', 'role'],
    required: ['full_name', 'email'],
    optional: ['role'],
    examples: [
      ['Ahmed Hassan', 'ahmed.hassan@example.com', 'student'],
      ['Dr. Sarah Ahmed', 'sarah.ahmed@example.com', 'teacher'],
      ['Mohamed Ali', 'mohamed.ali@example.com', 'topic_admin'],
      ['Dr. Fatima Hussein', 'fatima.hussein@example.com', 'department_admin'],
    ],
  },
};

// Built-in template definitions
interface BuiltInTemplate {
  id: string;
  title: string;
  description: string;
  format: 'csv' | 'xlsx' | 'txt';
  icon: 'spreadsheet' | 'file';
}

const BUILTIN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: 'user_invite',
    title: 'User Invite Template',
    description: 'Bulk invite users with name, email, and role assignments',
    format: 'xlsx',
    icon: 'spreadsheet',
  },
  {
    id: 'mcq',
    title: 'MCQ Template',
    description: 'Multiple choice questions with 5 options (A-E) and section tagging',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'osce',
    title: 'OSCE Template',
    description: 'Image-based questions with 5 True/False statements',
    format: 'xlsx',
    icon: 'spreadsheet',
  },
  {
    id: 'matching',
    title: 'Matching Questions Template',
    description: 'Match items from Column A to Column B with section tagging',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'flashcard',
    title: 'Flashcards Template',
    description: 'Front and back flashcard content with section tagging',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'table',
    title: 'Key Tables Template',
    description: 'Study tables with headers and rows',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'algorithm',
    title: 'Pathways Template',
    description: 'Step-by-step clinical pathways',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'exam_tip',
    title: 'Exam Tips Template',
    description: 'Quick tips and mnemonics for exams',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'interactive_case_guide',
    title: 'Interactive Cases — How It Works',
    description: 'Comprehensive guide covering case logic, 10-section structure, scoring, voice, and admin workflow',
    format: 'txt',
    icon: 'file',
  },
  {
    id: 'interactive_case_prompt',
    title: 'Interactive Cases — AI Prompt Template',
    description: 'Ready-to-paste prompt for Claude/ChatGPT to generate valid case JSON for import',
    format: 'txt',
    icon: 'file',
  },
  {
    id: 'essay',
    title: 'Short Questions Template',
    description: 'Short question-type content with scenario, model answer, and keywords',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'true_false',
    title: 'True/False Questions Template',
    description: 'True/False statements with explanations and difficulty levels',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'guided_explanation',
    title: 'Guided Explanations Template',
    description: 'Socratic-method guided questions with hints, answers, and key takeaways',
    format: 'csv',
    icon: 'spreadsheet',
  },
];

// Template generation functions
function escapeField(field: string | undefined | null): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsvFromSchema(schema: TemplateSchema): string {
  const headerLine = schema.columns.map(escapeField).join(',');
  const dataLines = schema.examples.map(row => 
    row.map(escapeField).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

function generateCsvContent(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeField).join(',');
  const dataLines = rows.map(row => row.map(escapeField).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function downloadXlsx(filename: string, sheetData: (string | undefined)[][], sheetName: string = 'Sheet1') {
  await writeArrayToExcel(sheetData, filename, sheetName);
}

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



function downloadInteractiveCaseGuide() {
  const content = `# Interactive Cases — How It Works
# ================================================
# KALM Hub — Structured Interactive Clinical Cases
# ================================================

## Overview

Interactive Cases are structured, pre-built clinical simulations where students
work through a realistic patient encounter section by section. Unlike free-form
AI chat, every case is authored (or AI-generated) with fixed content, rubrics,
and scoring — ensuring consistency and medical accuracy.

Cases are stored in the "virtual_patient_cases" table. The authoritative data
lives in the "generated_case_data" JSONB column.

---

## The 10 Sections

Each case can include up to 10 sections (admins toggle which are active):

1. HISTORY TAKING
   Modes: full_conversation, paramedic_handover, triage_note, witness_account, no_history
   - Full conversation: student chats with the patient in Egyptian Arabic
     (with ElevenLabs text-to-speech voice). A checklist of expected questions
     is used for scoring (categories A–E).
   - Paramedic handover: ATMIST format, student answers comprehension Qs.
   - Other modes: read-only narrative with comprehension questions.
   Max score set per case.

2. PHYSICAL EXAMINATION
   Body map with 8 fixed anatomical regions:
     general, head_neck, vital_signs, chest, upper_limbs, abdomen, lower_limbs, extra
   ⚠️ IMPORTANT: Only these 8 exact keys are valid. Do NOT use descriptive keys
   like "wound_assessment", "abdomen_palpation", or "chest_auscultation".
   Use "extra" with a custom "label" for any special examination (e.g., Wound, DRE, Fundoscopy).
   Non-standard keys are auto-normalized during import/generation but may cause
   unexpected merging — always use the correct keys from the start.
   - Each region has a text finding (hidden until student clicks).
   - vital_signs includes a structured vitals grid (name, value, unit, abnormal).
   - "extra" has a custom label for special exams (e.g., DRE, fundoscopy).
   Students reveal regions to gather findings. Score = max_score awarded holistically.

3. INVESTIGATIONS — LABS
   A pool of available lab tests (e.g., CBC, CRP, LFT).
   Each test is marked "is_key" (essential) or not.
   - Selecting a key test: +points
   - Selecting an unnecessary test: −1 penalty
   Students must pick wisely. Score = sum of key test points minus penalties.

4. INVESTIGATIONS — IMAGING
   Same logic as labs but for imaging (X-ray, CT, MRI, etc.).
   Each study has result text, interpretation, and optional image_url.

5. DIAGNOSIS
   Three-part rubric:
   a) Possible diagnoses (list expected differentials)
   b) Differential diagnosis (reasoning points)
   c) Final diagnosis (single answer)
   Each part has points and a model_answer for AI scoring.

6. MEDICAL MANAGEMENT
   Mix of MCQ and free-text questions.
   - MCQ: options[], correct answer, explanation, points
   - Free-text: rubric with expected_points[], model_answer, points
   Score = sum of question points.

7. SURGICAL MANAGEMENT
   Same format as Medical Management.

8. MONITORING & FOLLOW-UP
   Single free-text question with rubric (expected_points, model_answer, points).

9. PATIENT & FAMILY ADVICE
   Single free-text question with rubric.

10. CONCLUSION
    Tasks of type: ward_round_presentation, key_decision, or learning_point.
    Each task has instruction text and a rubric.

PROFESSIONAL ATTITUDE (bonus)
   Scored holistically across the entire case.
   Items like: introduces self, maintains eye contact, shows empathy.
   Default max_score: 10.

---

## Scoring

Default total: 120 points (distributed across active sections + professional attitude).
After a student completes all sections, the AI scores their answers via an edge
function and produces a 5-category summary report:
  - Professional Attitude
  - History Taking
  - Physical Examination
  - Investigations
  - Diagnosis & Management

Each category shows score, percentage, and qualitative feedback.

---

## Anti-Cheat

During a case attempt:
  - Text selection disabled (select-none)
  - Copy/paste blocked
  - Watermark overlay with student name
  - Time tracking per section

---

## Admin Workflow

### Creating a Case
Open the "Create Case" dialog (5 tabs):
  Tab 1 — Basics: title, chief complaint, module, chapter, level, time, tags
  Tab 2 — Sections: toggle active sections, set question counts
  Tab 3 — History Mode: choose mode + patient language
  Tab 4 — Patient: name, age, gender, avatar, delivery mode
  Tab 5 — Review: summary before creation

Two paths after creation:
  a) "Generate with AI" — uses chapter PDF + optional reference documents
     to auto-generate all section content via edge function
  b) "Build Manually" — creates an empty skeleton; admin fills in content
     via the Case Preview Editor

### Case Preview Editor
After a case exists, admins can edit every detail:
  - Edit all section content inline
  - Voice character: pick an ElevenLabs voice for TTS (per-case override)
  - Preview voice: hear a sample (1-minute cooldown between previews to
    respect API rate limits — the button disables temporarily)
  - Patient tone: adjust the AI patient's conversational tone
  - History time limit: set max minutes for history-taking
  - Section toggles: enable/disable individual sections
  - Score recalculation: auto-update total score from section max_scores
  - Avatar picker: choose a patient avatar image
  - Move / Copy: move or copy the case to another chapter or module

### JSON Import
Admins can import a case by clicking the "Import JSON" button in the Interactive
Cases admin list. This opens an Import Modal with two options:
  - **Paste Text**: Copy the JSON directly from ChatGPT/Claude and paste it in.
    This is the fastest method — no need to save a file first.
  - **Upload File**: Drag & drop or browse for a .json file.

The app automatically handles common issues like missing outer curly braces {},
markdown code fences, and trailing commas. However, for best results, try to
copy the complete JSON block from the AI output.

The JSON can be generated using the AI Prompt Template available in Help & Templates.

---

## Voice (ElevenLabs TTS)

History-taking in full_conversation mode uses ElevenLabs for patient voice.
  - Each case can have a per-case voice override (voice_id field)
  - Default voices are configured at the platform level
  - Preview button plays a sample; after each preview there is a ~1 minute
    cooldown to stay within API rate limits
  - To add new voices, contact the platform admin

---

## Tips for Creating Good Cases

1. Start with a clear chief complaint that anchors the scenario
2. Include 3–5 key history questions the student must ask
3. Make physical exam findings clinically consistent
4. Include both key and unnecessary labs/imaging to test clinical reasoning
5. Write clear rubrics with model answers for fair AI scoring
6. Set appropriate difficulty level and estimated time
7. Review the case in the Preview Editor before publishing
8. Use reference documents (PDFs) for AI generation to improve accuracy
`;

  downloadTxt('interactive_cases_guide.md', content);
}

function downloadInteractiveCasePrompt() {
  const content = `# Interactive Cases — AI Generation Prompt
# ================================================
# Copy everything below, fill in the [PLACEHOLDERS], paste into Claude or
# ChatGPT, then either:
#   1. Copy the JSON output and PASTE it directly into the KALM Hub Import Modal
#   2. Or save it as a .json file and upload it
#
# TIP: If the output is long, you can copy the text directly from the chat
# and paste it into the KALM Hub Import Modal. No need to save a file!
# ================================================

You are a medical education content creator. Generate a complete structured
clinical case in JSON format for an interactive medical simulation platform.

## CASE REQUIREMENTS

- Clinical scenario: [DESCRIBE THE CASE — e.g., "45-year-old male presenting with acute right iliac fossa pain suggestive of appendicitis"]
- Difficulty level: [beginner / intermediate / advanced]
- Target audience: [e.g., "3rd year medical students"]
- History mode: [full_conversation / paramedic_handover / triage_note / witness_account / no_history]
- Active sections: [list which sections to include, e.g., "all 10" or "history, physical exam, labs, diagnosis, medical management"]

## OUTPUT FORMAT

Return a single JSON object with this exact structure. Do NOT wrap in markdown code fences.

{
  "case_meta": {
    "title": "Case title",
    "chief_complaint": "One-line presenting complaint",
    "level": "beginner | intermediate | advanced",
    "estimated_minutes": 20,
    "tags": ["tag1", "tag2"]
  },
  "patient": {
    "name": "Patient Name",
    "age": 45,
    "gender": "male | female",
    "occupation": "Optional",
    "social_history": "Optional background"
  },
  "professional_attitude": {
    "max_score": 10,
    "items": [
      { "key": "pa_intro", "label": "Introduces self and role", "expected_behaviour": "States name and title clearly" },
      { "key": "pa_consent", "label": "Obtains consent", "expected_behaviour": "Asks permission before proceeding" },
      { "key": "pa_empathy", "label": "Shows empathy", "expected_behaviour": "Acknowledges patient concerns" },
      { "key": "pa_communication", "label": "Clear communication", "expected_behaviour": "Uses simple language" },
      { "key": "pa_closure", "label": "Appropriate closure", "expected_behaviour": "Summarizes and checks understanding" }
    ],
    "scoring_note": "Each item scored 0-2. Total = sum of item scores."
  },
  "history_taking": {
    "mode": "full_conversation",
    "max_score": 20,
    "checklist": [
      {
        "key": "A",
        "label": "Presenting Complaint",
        "items": [
          { "key": "hx_onset", "label": "Onset of symptoms" },
          { "key": "hx_character", "label": "Character of pain" },
          { "key": "hx_location", "label": "Location" },
          { "key": "hx_duration", "label": "Duration" },
          { "key": "hx_severity", "label": "Severity (scale)" }
        ]
      },
      {
        "key": "B",
        "label": "Associated Symptoms",
        "items": [
          { "key": "hx_nausea", "label": "Nausea/vomiting" },
          { "key": "hx_fever", "label": "Fever" }
        ]
      },
      {
        "key": "C",
        "label": "Past Medical History",
        "items": [
          { "key": "hx_pmh", "label": "Previous illnesses/surgeries" },
          { "key": "hx_meds", "label": "Current medications" },
          { "key": "hx_allergies", "label": "Allergies" }
        ]
      },
      {
        "key": "D",
        "label": "Social History",
        "items": [
          { "key": "hx_smoking", "label": "Smoking" },
          { "key": "hx_alcohol", "label": "Alcohol" }
        ]
      },
      {
        "key": "E",
        "label": "Family History",
        "items": [
          { "key": "hx_fhx", "label": "Relevant family history" }
        ]
      }
    ],
    "comprehension_questions": [],
    "arabic_reference": "نص مرجعي بالعربية يصف شكوى المريض وتاريخه المرضي بالتفصيل",
    "english_reference": "Reference text describing the patient's complaint and history in detail"
  },
  "physical_examination": {
    "max_score": 15,
    "findings": {
      "general": { "text": "Patient appears [description]" },
      "vital_signs": {
        "vitals": [
          { "name": "HR", "value": "88", "unit": "bpm", "abnormal": false },
          { "name": "BP", "value": "130/85", "unit": "mmHg", "abnormal": false },
          { "name": "RR", "value": "18", "unit": "/min", "abnormal": false },
          { "name": "Temp", "value": "38.2", "unit": "°C", "abnormal": true },
          { "name": "SpO2", "value": "98", "unit": "%", "abnormal": false }
        ],
        "text": "Vital signs summary"
      },
      "head_neck": { "text": "Finding or 'Normal examination'" },
      "chest": { "text": "Finding or 'Normal examination'" },
      "abdomen": { "text": "**Inspection:** Distended abdomen with visible surgical scar in RIF.\\n**Palpation:** Tender in RIF with guarding, no rebound tenderness.\\n**Percussion:** Tympanic.\\n**Auscultation:** Reduced bowel sounds." },
      "upper_limbs": { "text": "Normal examination" },
      "lower_limbs": { "text": "Normal examination" },
      "extra": { "label": "Special Examination", "text": "e.g., DRE findings" }
    }
  },
  "investigations_labs": {
    "max_score": 10,
    "key_tests": ["cbc", "crp"],
    "available_tests": {
      "cbc": {
        "label": "Complete Blood Count",
        "result": "WBC 14.2 × 10⁹/L (↑), Hb 13.5 g/dL, Plt 250 × 10⁹/L",
        "interpretation": "Leukocytosis suggesting infection/inflammation",
        "is_key": true,
        "points": 3
      },
      "crp": {
        "label": "C-Reactive Protein",
        "result": "45 mg/L (↑)",
        "interpretation": "Elevated, consistent with acute inflammation",
        "is_key": true,
        "points": 3
      },
      "lft": {
        "label": "Liver Function Tests",
        "result": "All within normal limits",
        "interpretation": "Normal — rules out hepatobiliary cause",
        "is_key": false,
        "points": 0
      }
    }
  },
  "investigations_imaging": {
    "max_score": 10,
    "key_investigations": ["us_abdomen"],
    "available_imaging": {
      "us_abdomen": {
        "label": "Ultrasound Abdomen",
        "result": "Findings description",
        "interpretation": "Interpretation",
        "is_key": true,
        "points": 5
      },
      "ct_abdomen": {
        "label": "CT Abdomen with Contrast",
        "result": "Findings description",
        "interpretation": "Interpretation",
        "is_key": false,
        "points": 0
      }
    }
  },
  "diagnosis": {
    "max_score": 15,
    "rubric": {
      "possible_diagnosis": {
        "label": "List possible diagnoses",
        "expected": ["Diagnosis A", "Diagnosis B", "Diagnosis C"],
        "points": 5,
        "model_answer": "The possible diagnoses include..."
      },
      "differential_diagnosis": {
        "label": "Justify your differential",
        "reasoning_points": ["Point 1", "Point 2"],
        "points": 5,
        "model_answer": "The most likely differential..."
      },
      "final_diagnosis": {
        "label": "State the most likely diagnosis",
        "expected_top": "Final Diagnosis",
        "points": 5,
        "model_answer": "The final diagnosis is..."
      }
    }
  },
  "medical_management": {
    "max_score": 10,
    "questions": [
      {
        "id": "mm_1",
        "type": "mcq",
        "question": "What is the first-line treatment?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": "Option A",
        "explanation": "Because...",
        "points": 5
      },
      {
        "id": "mm_2",
        "type": "free_text",
        "question": "Outline your management plan.",
        "points": 5,
        "rubric": {
          "expected_points": ["Point 1", "Point 2", "Point 3"],
          "model_answer": "The management plan includes...",
          "points": 5
        }
      }
    ]
  },
  "surgical_management": {
    "max_score": 10,
    "questions": [
      {
        "id": "sm_1",
        "type": "free_text",
        "question": "What surgical intervention is indicated?",
        "points": 10,
        "rubric": {
          "expected_points": ["Indication", "Procedure", "Complications"],
          "model_answer": "The indicated procedure is...",
          "points": 10
        }
      }
    ]
  },
  "monitoring_followup": {
    "max_score": 5,
    "question": "What monitoring and follow-up would you arrange?",
    "rubric": {
      "expected_points": ["Vital signs monitoring", "Repeat labs", "Follow-up appointment"],
      "model_answer": "Post-procedure monitoring includes...",
      "points": 5
    }
  },
  "patient_family_advice": {
    "max_score": 5,
    "question": "What advice would you give the patient and family?",
    "rubric": {
      "expected_points": ["Explain diagnosis", "Explain procedure", "Warning signs"],
      "model_answer": "I would explain to the patient...",
      "points": 5
    }
  },
  "conclusion": {
    "max_score": 10,
    "tasks": [
      {
        "id": "conc_1",
        "type": "ward_round_presentation",
        "label": "Ward Round Presentation",
        "instruction": "Present this case as if on a ward round.",
        "rubric": {
          "expected_structure": ["Demographics", "Presenting complaint", "Key findings", "Diagnosis", "Plan"],
          "model_answer": "This is a [age]-year-old [gender] who presented with...",
          "points": 10
        }
      }
    ]
  }
}

## RULES

1. Return ONLY the JSON object — no markdown, no explanation, no code fences
2. All section max_scores should sum to approximately 120 (adjust as needed)
3. Use medically accurate content appropriate for the difficulty level
4. Include at least 3-5 unnecessary labs/imaging to test clinical reasoning
5. History checklist should have 12-20 items across categories A-E
6. Physical exam findings must be clinically consistent with the diagnosis
7. Diagnosis rubric must include plausible differentials, not just the answer
8. Management questions should mix MCQ and free-text types
9. All IDs must be unique strings (use prefixes like hx_, mm_, sm_, conc_)
10. For full_conversation mode, include both arabic_reference and english_reference
11. Physical examination findings MUST use ONLY these 8 region keys: general, head_neck, vital_signs, chest, upper_limbs, abdomen, lower_limbs, extra. Do NOT use descriptive keys like wound_assessment, abdomen_palpation, or chest_auscultation — map them to the closest fixed key. Use "extra" with a custom "label" for special exams (e.g., DRE, Wound, Fundoscopy). CRITICAL: Combine ALL examination components (inspection, palpation, percussion, auscultation, special tests) into a SINGLE "text" field per region. Use **bold** markdown sub-headings within the text to separate components, e.g.: "**Inspection:** Distended abdomen.\\n**Palpation:** Tender in RIF with guarding.\\n**Auscultation:** Reduced bowel sounds." Never create separate keys like abdomen_inspection and abdomen_palpation.

## TIP
If the output is long, you can copy the text directly from the chat and paste it into the KALM Hub Import Modal (click "Import JSON" → "Paste Text"). The app automatically fixes missing outer braces and code fences.
`;

  downloadTxt('interactive_cases_ai_prompt.md', content);
}

function generateTemplateDownload(templateId: string) {
  const schema = TEMPLATE_SCHEMAS[templateId];
  
  switch (templateId) {
    case 'mcq':
    case 'flashcard':
    case 'table':
    case 'algorithm':
    case 'exam_tip':
    case 'matching':
    case 'essay':
    case 'true_false':
    case 'guided_explanation':
      // All CSV-based templates use the schema system
      if (schema) {
        const fileName = templateId === 'algorithm' ? 'pathways_template.csv' : `${templateId}_template.csv`;
        downloadCsv(fileName, generateCsvFromSchema(schema));
      }
      break;
      
    case 'osce':
      // OSCE uses XLSX format with the schema
      if (schema) {
        const sheetData = [schema.columns, ...schema.examples];
        downloadXlsx('osce_template.xlsx', sheetData, 'OSCE Questions');
      }
      break;
      
    case 'user_invite':
      // User invite available in both CSV and XLSX
      if (schema) {
        const sheetData = [schema.columns, ...schema.examples];
        downloadXlsx('user_invite_template.xlsx', sheetData, 'Users');
        // Also generate CSV version
        setTimeout(() => {
          downloadCsv('user_invite_template.csv', generateCsvFromSchema(schema));
        }, 500);
      }
      break;
      

    case 'interactive_case_guide':
      downloadInteractiveCaseGuide();
      break;

    case 'interactive_case_prompt':
      downloadInteractiveCasePrompt();
      break;
      
    default:
      toast.error('Unknown template type');
      return;
  }
  
  toast.success('Template downloaded successfully');
}

export function HelpTemplatesTab() {
  const { user, isPlatformAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<AdminHelpFile | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null,
  });

  // Fetch help files (only guides now, templates are built-in)
  const { data: helpFiles, isLoading } = useQuery({
    queryKey: ['admin-help-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_help_files')
        .select('*')
        .eq('category', 'guide')
        .order('display_order');
      
      if (error) throw error;
      return data as AdminHelpFile[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (file: AdminHelpFile) => {
      // Delete from storage first
      const path = file.file_url.split('/admin-templates/')[1];
      if (path) {
        await supabase.storage.from('admin-templates').remove([path]);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('admin_help_files')
        .delete()
        .eq('id', file.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-help-files'] });
      toast.success('File deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast.error('Please fill in required fields');
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileName = `guide/${Date.now()}_${uploadForm.file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('admin-templates')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('admin-templates')
        .getPublicUrl(fileName);

      // Get current max display_order
      const existingFiles = helpFiles || [];
      const maxOrder = existingFiles.length > 0 
        ? Math.max(...existingFiles.map(f => f.display_order)) + 1 
        : 0;

      // Insert record
      const { error: insertError } = await supabase
        .from('admin_help_files')
        .insert({
          category: 'guide',
          title: uploadForm.title,
          description: uploadForm.description || null,
          file_url: publicUrl,
          file_name: uploadForm.file.name,
          template_type: null,
          display_order: maxOrder,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['admin-help-files'] });
      toast.success('Guide uploaded successfully');
      setUploadDialogOpen(false);
      setUploadForm({
        title: '',
        description: '',
        file: null,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (file: AdminHelpFile) => {
    window.open(file.file_url, '_blank');
  };

  const guides = helpFiles || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload Button (Platform Admin only) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Help & Templates
          </h2>
          <p className="text-sm text-muted-foreground">
            Download guides and templates for content preparation.
          </p>
        </div>
        {isPlatformAdmin && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Guide
          </Button>
        )}
      </div>

      {/* Guides Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Guides
          </CardTitle>
          <CardDescription>
            Documentation and guides for preparing content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guides.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No guides uploaded yet.
              {isPlatformAdmin && ' Click "Upload Guide" to add one.'}
            </p>
          ) : (
            <div className="space-y-3">
              {guides.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{file.title}</p>
                      {file.description && (
                        <p className="text-sm text-muted-foreground">{file.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{file.file_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {isPlatformAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeletingFile(file)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Built-in Bulk Upload Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Upload Templates
          </CardTitle>
          <CardDescription>
            Download templates with the correct format for bulk content uploads. Each template includes example data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {BUILTIN_TEMPLATES.map((template) => (
              <div 
                key={template.id} 
                className="flex flex-col p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-secondary rounded-full font-medium">
                    .{template.format}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{template.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 w-full" 
                  onClick={() => generateTemplateDownload(template.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog - Now only for Guides */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Guide</DialogTitle>
            <DialogDescription>
              Add a new documentation guide for admins to reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Admin Content Preparation Guide"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the guide..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>File *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadForm(prev => ({ ...prev, file }));
                    }
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  {uploadForm.file ? (
                    <p className="text-sm font-medium">{uploadForm.file.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click to select a file
                      <br />
                      <span className="text-xs">Accepts: .pdf, .doc, .docx</span>
                    </p>
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFile?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingFile) {
                  deleteMutation.mutate(deletingFile);
                  setDeletingFile(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
