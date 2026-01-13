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
    id: 'mcq',
    title: 'MCQ Template',
    description: 'Multiple choice questions with 5 options (A-E)',
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
    id: 'case_scenario',
    title: 'Case Scenarios Template',
    description: 'Clinical case scenarios with questions and model answers',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'matching',
    title: 'Matching Questions Template',
    description: 'Match items from Column A to Column B',
    format: 'csv',
    icon: 'spreadsheet',
  },
  {
    id: 'flashcard',
    title: 'Flashcards Template',
    description: 'Front and back flashcard content',
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
    id: 'virtual_patient',
    title: 'Virtual Patient Template',
    description: 'Copy/paste template for quick stage building',
    format: 'txt',
    icon: 'file',
  },
];

// Template generation functions
function generateCsvContent(headers: string[], rows: string[][]): string {
  const escapeField = (field: string) => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };
  
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

function downloadXlsx(filename: string, sheetData: any[][], sheetName: string = 'Sheet1') {
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

function downloadVirtualPatientTemplate() {
  const template = `# Virtual Patient (Linear) – Copy/Paste Template
# ================================================
#
# WORKFLOW:
# 1. Create Case: Click "Add Case" to create the case header (title, intro, difficulty)
# 2. Build Stages: Click "Build Stages" and use "Quick Build (Paste Template)" 
#    to paste this template and create all stages at once
#
# TEMPLATE FORMAT:
# - Each stage starts with "STAGE N:" where N is the stage number
# - TYPE: mcq | multi_select | short_answer
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
TYPE: mcq
PATIENT_INFO: Mammography shows a 2cm irregular mass with microcalcifications (BIRADS 4).
PROMPT: What is the next appropriate step?
CHOICES: (A) Repeat mammography in 6 months (B) MRI of the breast (C) Core needle biopsy (D) Surgical excision
CORRECT: C
EXPLANATION: BIRADS 4 lesions have a 2-95% malignancy rate and require tissue diagnosis. Core needle biopsy provides histological diagnosis before definitive treatment.
TEACHING_POINTS:
- BIRADS 4 requires tissue diagnosis
- Core biopsy is preferred over FNA for solid masses (provides architecture)
- MRI is not routinely used for initial diagnosis

STAGE 3:
TYPE: short_answer
PATIENT_INFO: Biopsy reveals invasive ductal carcinoma, Grade 2, ER positive, PR positive, HER2 negative.
PROMPT: Outline the components of triple assessment for a breast lump.
RUBRIC_REQUIRED:
- clinical examination
- imaging
- biopsy
- tissue sampling
RUBRIC_OPTIONAL:
- mammography
- ultrasound
- core needle biopsy
- fine needle aspiration
CORRECT: Triple assessment includes: 1) Clinical examination (history and physical), 2) Imaging (mammography for women ≥40, ultrasound for women <40), and 3) Tissue sampling (core biopsy or FNA).
EXPLANATION: Triple assessment is the gold standard approach for evaluating any breast lump. All three components are necessary to accurately diagnose breast pathology.
TEACHING_POINTS:
- All suspicious breast lumps require triple assessment
- Clinical examination alone is insufficient
- Tissue diagnosis is mandatory before treatment planning`;

  downloadTxt('virtual_patient_template.txt', template);
}


function generateTemplateDownload(templateId: string) {
  switch (templateId) {
    case 'mcq':
      downloadCsv('mcq_template.csv', generateCsvContent(
        ['stem', 'choiceA', 'choiceB', 'choiceC', 'choiceD', 'choiceE', 'correct_key', 'explanation', 'difficulty'],
        [
          [
            'A 45-year-old patient presents with chest pain radiating to the left arm. Which of the following is the most likely diagnosis?',
            'Acute myocardial infarction',
            'Gastroesophageal reflux disease',
            'Costochondritis',
            'Pulmonary embolism',
            'Aortic dissection',
            'A',
            'The classic presentation of chest pain radiating to the left arm is highly suggestive of acute myocardial infarction.',
            'medium'
          ],
          [
            'Which of the following is the first-line treatment for hypertension in a diabetic patient?',
            'Beta-blockers',
            'ACE inhibitors',
            'Calcium channel blockers',
            'Thiazide diuretics',
            'Alpha-blockers',
            'B',
            'ACE inhibitors are first-line in diabetic patients due to their renoprotective effects.',
            'easy'
          ]
        ]
      ));
      break;
      
    case 'osce':
      downloadXlsx('osce_template.xlsx', [
        ['image_filename', 'history_text', 'statement_1', 'answer_1', 'explanation_1', 'statement_2', 'answer_2', 'explanation_2', 'statement_3', 'answer_3', 'explanation_3', 'statement_4', 'answer_4', 'explanation_4', 'statement_5', 'answer_5', 'explanation_5'],
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
          'The findings are more consistent with COPD/emphysema.'
        ]
      ], 'OSCE Questions');
      break;
      
    case 'case_scenario':
      downloadCsv('case_scenarios_template.csv', generateCsvContent(
        ['title', 'case_history', 'case_questions', 'model_answer', 'rating'],
        [
          [
            'Acute Chest Pain Assessment',
            'A 55-year-old male presents to the emergency department with crushing substernal chest pain that started 2 hours ago. The pain radiates to his left arm and jaw. He is diaphoretic and appears anxious. His vital signs show: BP 150/95 mmHg, HR 110 bpm, RR 22/min, SpO2 96% on room air. He has a history of hypertension and type 2 diabetes.',
            'What is your differential diagnosis?|What initial investigations would you order?|Outline your immediate management plan.',
            'Differential diagnosis includes: 1) Acute coronary syndrome (STEMI/NSTEMI), 2) Aortic dissection, 3) Pulmonary embolism, 4) Pericarditis. Initial investigations: 12-lead ECG, Troponin levels, Chest X-ray, CBC, BMP, Coagulation studies. Immediate management: Oxygen therapy, IV access, Aspirin 300mg, Sublingual GTN, Morphine for pain, Continuous cardiac monitoring.',
            '4'
          ]
        ]
      ));
      break;
      
    case 'matching':
      downloadCsv('matching_questions_template.csv', generateCsvContent(
        ['instruction', 'item_a_1', 'item_a_2', 'item_a_3', 'item_a_4', 'item_b_1', 'item_b_2', 'item_b_3', 'item_b_4', 'match_1', 'match_2', 'match_3', 'match_4', 'explanation', 'difficulty', 'show_explanation'],
        [
          [
            'Match each drug with its mechanism of action',
            'Aspirin',
            'Metformin',
            'Lisinopril',
            'Omeprazole',
            'ACE inhibitor',
            'Proton pump inhibitor',
            'COX inhibitor',
            'Biguanide',
            '3',
            '4',
            '1',
            '2',
            'Aspirin inhibits COX, Metformin is a biguanide that reduces hepatic glucose production, Lisinopril is an ACE inhibitor, and Omeprazole is a proton pump inhibitor.',
            'easy',
            'TRUE'
          ]
        ]
      ));
      break;
      
    case 'flashcard':
      downloadCsv('flashcards_template.csv', generateCsvContent(
        ['front', 'back'],
        [
          ['What is the powerhouse of the cell?', 'The mitochondria - responsible for cellular respiration and ATP production.'],
          ['What are the 4 chambers of the heart?', 'Right atrium, Right ventricle, Left atrium, Left ventricle'],
          ['What is the normal range for blood glucose (fasting)?', '70-100 mg/dL (3.9-5.6 mmol/L)']
        ]
      ));
      break;
      
    case 'table':
      downloadCsv('tables_template.csv', generateCsvContent(
        ['title', 'headers', 'row1', 'row2', 'row3'],
        [
          [
            'Blood Cell Types and Functions',
            'Cell Type|Normal Count|Primary Function',
            'Red Blood Cells (RBC)|4.5-5.5 million/μL|Oxygen transport via hemoglobin',
            'White Blood Cells (WBC)|4,000-11,000/μL|Immune defense and inflammation',
            'Platelets|150,000-400,000/μL|Blood clotting and hemostasis'
          ]
        ]
      ));
      break;
      
    case 'algorithm':
      downloadCsv('algorithms_template.csv', generateCsvContent(
        ['title', 'steps'],
        [
          [
            'Basic Life Support (BLS) Algorithm',
            'Check responsiveness::Tap shoulders and shout "Are you okay?"|Call for help::Activate emergency response system and get AED|Open airway::Head tilt-chin lift maneuver|Check breathing::Look, listen, feel for 10 seconds|Start CPR::30 compressions : 2 breaths, rate 100-120/min|Apply AED::Follow voice prompts when available'
          ]
        ]
      ));
      break;
      
    case 'exam_tip':
      downloadCsv('exam_tips_template.csv', generateCsvContent(
        ['title', 'tips'],
        [
          [
            'Cardiology High-Yield Tips',
            'Always check ECG in any patient with chest pain|Remember MONA for ACS: Morphine, Oxygen, Nitrates, Aspirin|Beta-blockers are contraindicated in acute decompensated heart failure|Troponin rises 4-6 hours after MI onset|STEMI requires emergent reperfusion within 90 minutes'
          ]
        ]
      ));
      break;
      
    case 'virtual_patient':
      downloadVirtualPatientTemplate();
      break;
      
    default:
      toast.error('Unknown template type');
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
