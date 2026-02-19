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
import * as XLSX from 'xlsx';

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
    columns: ['stem', 'choiceA', 'choiceB', 'choiceC', 'choiceD', 'choiceE', 'correct_key', 'explanation', 'difficulty', 'concept_name', 'section_name', 'section_number'],
    required: ['stem', 'choiceA', 'choiceB', 'correct_key'],
    optional: ['choiceC', 'choiceD', 'choiceE', 'explanation', 'difficulty', 'concept_name', 'section_name', 'section_number'],
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
        'Acute Coronary Syndrome',
        'Cardiac Emergencies',
        '1'
      ],
    ],
  },
  osce: {
    columns: ['image_filename', 'history_text', 'statement_1', 'answer_1', 'explanation_1', 'statement_2', 'answer_2', 'explanation_2', 'statement_3', 'answer_3', 'explanation_3', 'statement_4', 'answer_4', 'explanation_4', 'statement_5', 'answer_5', 'explanation_5', 'concept_name', 'section_name', 'section_number'],
    required: ['image_filename', 'history_text', 'statement_1', 'answer_1'],
    optional: ['explanation_1', 'statement_2', 'answer_2', 'explanation_2', 'statement_3', 'answer_3', 'explanation_3', 'statement_4', 'answer_4', 'explanation_4', 'statement_5', 'answer_5', 'explanation_5', 'concept_name', 'section_name', 'section_number'],
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
        'COPD',
        'Radiology',
        '2'
      ],
    ],
  },
  flashcard: {
    columns: ['title', 'front', 'back', 'concept_name', 'section_name', 'section_number'],
    required: ['title', 'front', 'back'],
    optional: ['concept_name', 'section_name', 'section_number'],
    examples: [
      ['Cardiac Physiology', 'What is the normal ejection fraction?', '55-70%', 'Cardiac Output', 'Heart Basics', '1'],
      ['Cardiac Anatomy', 'Name the 4 chambers of the heart', 'Left/Right Atrium, Left/Right Ventricle', 'Heart Anatomy', 'Heart Basics', '1'],
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
    columns: ['title', 'steps', 'section_name', 'section_number'],
    required: ['title', 'steps'],
    optional: ['section_name', 'section_number'],
    examples: [
      [
        'Chest Pain Workup',
        '1. Obtain ECG within 10 minutes|2. Check troponins|3. Assess HEART score|4. Consider stress testing if low-risk',
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
    columns: ['title', 'itemA_1', 'itemB_1', 'itemA_2', 'itemB_2', 'itemA_3', 'itemB_3', 'itemA_4', 'itemB_4', 'concept_name', 'section_name', 'section_number'],
    required: ['title', 'itemA_1', 'itemB_1', 'itemA_2', 'itemB_2'],
    optional: ['itemA_3', 'itemB_3', 'itemA_4', 'itemB_4', 'concept_name', 'section_name', 'section_number'],
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
        'Cardiac Auscultation',
        'Auscultation',
        '2'
      ],
    ],
  },
  essay: {
    columns: ['title', 'scenario_text', 'questions', 'model_answer', 'keywords', 'rating', 'concept_name', 'section_name', 'section_number'],
    required: ['title', 'scenario_text', 'questions', 'model_answer'],
    optional: ['keywords', 'rating', 'concept_name', 'section_name', 'section_number'],
    examples: [
      [
        'Diabetic Ketoacidosis Management',
        'A 22-year-old female with Type 1 diabetes presents to the emergency department with nausea, vomiting, and abdominal pain. Her blood glucose is 450 mg/dL, pH 7.1, and she has ketonuria.',
        'Outline the immediate management steps for this patient including fluid resuscitation, insulin therapy, and electrolyte monitoring.',
        'Immediate management includes: 1) IV normal saline bolus for fluid resuscitation, 2) Continuous IV insulin infusion at 0.1 units/kg/hr, 3) Potassium replacement once K+ < 5.3 mEq/L, 4) Monitor blood glucose hourly, 5) Check electrolytes every 2-4 hours, 6) Switch to dextrose-containing fluids when glucose < 250 mg/dL.',
        'DKA, insulin, fluid resuscitation, potassium, electrolyte monitoring',
        '3',
        'Diabetic Ketoacidosis',
        'Endocrine Emergencies',
        '1'
      ],
    ],
  },
  true_false: {
    columns: ['statement', 'correct_answer', 'explanation', 'difficulty', 'concept_name', 'section_name', 'section_number'],
    required: ['statement', 'correct_answer'],
    optional: ['explanation', 'difficulty', 'concept_name', 'section_name', 'section_number'],
    examples: [
      [
        'The left recurrent laryngeal nerve loops around the aortic arch before ascending to the larynx.',
        'TRUE',
        'The left recurrent laryngeal nerve hooks around the aortic arch (ligamentum arteriosum), while the right hooks around the subclavian artery.',
        'medium',
        'Recurrent Laryngeal Nerve',
        'Head and Neck Anatomy',
        '1'
      ],
      [
        'Insulin is secreted by alpha cells of the pancreatic islets.',
        'FALSE',
        'Insulin is secreted by beta cells. Alpha cells secrete glucagon.',
        'easy',
        'Insulin Secretion',
        'Endocrine Physiology',
        '2'
      ],
    ],
  },
  concept: {
    columns: ['concept_key', 'title', 'section_hint', 'description'],
    required: ['concept_key', 'title'],
    optional: ['section_hint', 'description'],
    examples: [
      ['virchow_triad', 'Virchow Triad', 'Venous thrombosis', 'Stasis, hypercoagulability, and endothelial injury as mechanisms of thrombosis.'],
      ['duplex_ultrasound', 'Duplex Ultrasound', 'Venous thrombosis', 'Primary imaging test to diagnose venous thrombosis and reflux.'],
      ['varicose_veins', 'Varicose Veins', 'Varicose veins', 'Dilated, tortuous superficial veins due to valvular incompetence.'],
      ['venous_ulcer', 'Venous Ulcer', 'Chronic venous insufficiency', 'Open wound on the lower leg caused by sustained venous hypertension.'],
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
    title: 'Algorithms Template',
    description: 'Step-by-step clinical algorithms',
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
    id: 'clinical_case',
    title: 'Clinical Cases Template',
    description: 'Multi-stage clinical case scenarios with MCQ, short answer, and read-only stages',
    format: 'txt',
    icon: 'file',
  },
  {
    id: 'essay',
    title: 'Short Answer Questions Template',
    description: 'Essay-type questions with scenario, model answer, and keywords',
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
    id: 'concept',
    title: 'Concepts Template',
    description: 'Bulk upload concepts with concept_key, title, and optional section_hint & description',
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

function downloadXlsx(filename: string, sheetData: (string | undefined)[][], sheetName: string = 'Sheet1') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Set column widths
  const colWidths = sheetData[0].map((_, i) => ({
    wch: Math.max(...sheetData.map(row => String(row[i] || '').length), 15)
  }));
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
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

function downloadClinicalCaseTemplate() {
  const template = `# Clinical Cases – Quick Build Template
# ================================================
#
# CLINICAL CASES support two modes:
# • Read Case: Static case with intro and read-only content (min 1 stage)
# • Practice Case: Interactive multi-stage simulation (min 3 stages)
#
# WORKFLOW:
# 1. Create Case: Click "Add Case" in Clinical Cases section
# 2. Fill metadata: Title, intro text, difficulty level, case mode
# 3. Build Stages: Click "Build Stages" → "Quick Build (Paste Template)"
# 4. Paste this template to create all stages at once
#
# TEMPLATE FORMAT:
# - Each stage starts with "STAGE N:" where N is the stage number
# - TYPE: mcq | multi_select | short_answer | read_only
# - PATIENT_INFO: (optional) New information revealed at this stage
# - PROMPT: The question or instruction for the student
# - CHOICES: (A) option (B) option (C) option (D) option (for mcq/multi_select)
# - CORRECT: A (for mcq) or A,C (for multi_select) or text (for short_answer)
# - EXPLANATION: (optional) Why this is correct
# - TEACHING_POINTS: (optional) Key learning points, each on a line starting with -
#
# FOR SHORT ANSWER (Rubric-Based Grading):
# - RUBRIC_REQUIRED: Concepts the student MUST mention (60% needed to pass)
# - RUBRIC_OPTIONAL: Bonus concepts (not required but good to mention)
#
# FOR READ ONLY STAGES:
# - Use TYPE: read_only
# - PROMPT contains the content to display
# - No CHOICES or CORRECT needed
#
# ================================================

STAGE 1:
TYPE: mcq
PATIENT_INFO: A 45-year-old woman presents with a painless lump in her right breast that she noticed 2 weeks ago. She has no family history of breast cancer.
PROMPT: What is the most appropriate first step in management?
CHOICES: (A) Reassure and observe (B) Order mammography (C) Perform fine needle aspiration (D) Refer for surgical excision
CORRECT: B
EXPLANATION: Mammography is the first-line imaging for breast lumps in women over 40. It helps characterize the lesion and guides further management.
TEACHING_POINTS:
- Triple assessment for breast lumps: clinical examination, imaging, and tissue sampling
- Mammography is preferred for women ≥40; ultrasound is preferred for women <40
- Never reassure without proper workup for a new breast lump

STAGE 2:
TYPE: short_answer
PATIENT_INFO: Mammography shows a 2cm irregular mass with microcalcifications (BIRADS 4).
PROMPT: Outline the components of triple assessment for a breast lump.
RUBRIC_REQUIRED:
- clinical examination
- imaging
- biopsy
RUBRIC_OPTIONAL:
- mammography
- ultrasound
- core needle biopsy
CORRECT: Triple assessment includes: clinical examination, imaging, and tissue sampling.
EXPLANATION: Triple assessment is the gold standard approach for evaluating any breast lump.

STAGE 3:
TYPE: read_only
PATIENT_INFO: Biopsy confirms invasive ductal carcinoma, Grade 2, ER positive, PR positive, HER2 negative.
PROMPT: The patient will now be referred to the multidisciplinary breast team for treatment planning. Key considerations include tumor staging, hormone receptor status, and patient preferences.`;

  downloadTxt('clinical_cases_template.txt', template);
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
    case 'concept':
      // All CSV-based templates use the schema system
      if (schema) {
        downloadCsv(`${templateId}_template.csv`, generateCsvFromSchema(schema));
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
      
    case 'clinical_case':
      downloadClinicalCaseTemplate();
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
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this file?')) {
                            deleteMutation.mutate(file);
                          }
                        }}
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
    </div>
  );
}
