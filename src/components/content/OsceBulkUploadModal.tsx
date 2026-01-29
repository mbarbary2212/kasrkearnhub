import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { BulkUploadAnalyzer } from '@/components/admin/BulkUploadAnalyzer';
import { useBulkUploadAnalyzer } from '@/hooks/useBulkUploadAnalyzer';
import { 
  Upload, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Download,
  Info,
  Trash2,
  SkipForward,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { logActivity } from '@/lib/activityLog';
import { resolveSectionId } from '@/lib/csvExport';
import { useChapterSections } from '@/hooks/useSections';

interface OsceBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  moduleCode?: string;
  chapterTitle?: string;
}

interface ParsedRow {
  rowNumber: number;
  imageFilename: string;
  historyText: string;
  statements: string[];
  answers: boolean[];
  explanations: string[];
  sectionName?: string;
  sectionNumber?: number;
  error?: string;
  hasImage?: boolean;
}

interface ExcelValidationResult {
  valid: ParsedRow[];
  invalid: ParsedRow[];
  requiredImages: string[];
}

export function OsceBulkUploadModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  moduleCode = 'MODULE',
  chapterTitle = 'CHAPTER',
}: OsceBulkUploadModalProps) {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  const { isAnalyzing, analysis, analyzeFile, clearAnalysis } = useBulkUploadAnalyzer();
  const { data: sections = [] } = useChapterSections(chapterId);

  const [step, setStep] = useState<'excel' | 'images' | 'review' | 'importing'>('excel');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelValidation, setExcelValidation] = useState<ExcelValidationResult | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Map<string, File>>(new Map());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [skipImagesStep, setSkipImagesStep] = useState(false);

  const storagePath = `${moduleCode}/${chapterTitle}/`;

  const resetState = () => {
    setStep('excel');
    setExcelFile(null);
    setExcelValidation(null);
    setUploadedImages(new Map());
    setImporting(false);
    setImportProgress(0);
    setParsedHeaders([]);
    setParsedRows([]);
    clearAnalysis();
    setSkipImagesStep(false);
  };

  // Parse Excel file locally
  const parseExcelFile = async (file: File): Promise<ExcelValidationResult> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

    const parsedRows: ParsedRow[] = [];
    const requiredImages: Set<string> = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header and 1-indexing

      const imageFilename = String(row['image_filename'] || '').trim();
      const historyText = String(row['case_history'] || '').trim();
      
      const statements = [
        String(row['statement_1_text'] || '').trim(),
        String(row['statement_2_text'] || '').trim(),
        String(row['statement_3_text'] || '').trim(),
        String(row['statement_4_text'] || '').trim(),
        String(row['statement_5_text'] || '').trim(),
      ];

      const rawAnswers = [
        String(row['statement_1_answer'] || '').trim().toUpperCase(),
        String(row['statement_2_answer'] || '').trim().toUpperCase(),
        String(row['statement_3_answer'] || '').trim().toUpperCase(),
        String(row['statement_4_answer'] || '').trim().toUpperCase(),
        String(row['statement_5_answer'] || '').trim().toUpperCase(),
      ];

      const explanations = [
        String(row['explanation_1'] || row['statement_1_explanation'] || '').trim(),
        String(row['explanation_2'] || row['statement_2_explanation'] || '').trim(),
        String(row['explanation_3'] || row['statement_3_explanation'] || '').trim(),
        String(row['explanation_4'] || row['statement_4_explanation'] || '').trim(),
        String(row['explanation_5'] || row['statement_5_explanation'] || '').trim(),
      ];

      // Validate - image_filename is now OPTIONAL
      const errors: string[] = [];

      if (!historyText) errors.push('Missing case_history');
      
      statements.forEach((s, idx) => {
        if (!s) errors.push(`Missing statement_${idx + 1}_text`);
      });

      const answers: boolean[] = [];
      rawAnswers.forEach((a, idx) => {
        if (a === 'T' || a === 'TRUE' || a === '1' || a === 'YES') {
          answers.push(true);
        } else if (a === 'F' || a === 'FALSE' || a === '0' || a === 'NO') {
          answers.push(false);
        } else {
          errors.push(`Invalid statement_${idx + 1}_answer: "${a}" (must be TRUE/FALSE)`);
          answers.push(false);
        }
      });

      // Only add to required images if image_filename is provided
      if (imageFilename) {
        requiredImages.add(imageFilename);
      }
      
      // Extract section info
      const sectionName = String(row['section_name'] || row['sectionname'] || row['section'] || '').trim() || undefined;
      const sectionNumRaw = String(row['section_number'] || row['sectionnumber'] || row['section_num'] || '').trim();
      const sectionNumber = sectionNumRaw ? parseInt(sectionNumRaw, 10) : undefined;

      parsedRows.push({
        rowNumber,
        imageFilename,
        historyText,
        statements,
        answers,
        explanations,
        sectionName,
        sectionNumber: !isNaN(sectionNumber as number) ? sectionNumber : undefined,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        hasImage: !!imageFilename,
      });
    }

    const valid = parsedRows.filter(r => !r.error);
    const invalid = parsedRows.filter(r => r.error);

    return {
      valid,
      invalid,
      requiredImages: Array.from(requiredImages),
    };
  };

  const handleExcelSelect = useCallback(async (file: File) => {
    try {
      setExcelFile(file);
      
      // Parse Excel to get headers and sample rows for AI analysis
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];
      
      if (allRows.length > 0) {
        setParsedHeaders(allRows[0] as string[]);
        setParsedRows(allRows.slice(1, 4) as string[][]); // First 3 data rows
      }
      
      const result = await parseExcelFile(file);
      setExcelValidation(result);
      
      if (result.valid.length === 0) {
        toast.error('No valid rows found in Excel file');
      } else {
        toast.success(`Found ${result.valid.length} valid OSCE questions`);
      }
    } catch (error: any) {
      toast.error('Failed to parse Excel file: ' + error.message);
      setExcelFile(null);
      setExcelValidation(null);
    }
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setUploadedImages(prev => {
      const newImages = new Map(prev);
      newImages.set(file.name, file);
      return newImages;
    });
    toast.success(`Added image: ${file.name}`);
  }, []);

  const removeImage = (filename: string) => {
    const newImages = new Map(uploadedImages);
    newImages.delete(filename);
    setUploadedImages(newImages);
  };

  // Check which images are missing (only for rows that have image_filename specified)
  const missingImages = useMemo(() => {
    if (!excelValidation) return [];
    return excelValidation.requiredImages.filter(
      filename => !uploadedImages.has(filename)
    );
  }, [excelValidation, uploadedImages]);

  // Count of questions with images
  const questionsWithImages = useMemo(() => {
    if (!excelValidation) return 0;
    return excelValidation.valid.filter(r => r.hasImage).length;
  }, [excelValidation]);

  const questionsWithoutImages = useMemo(() => {
    if (!excelValidation) return 0;
    return excelValidation.valid.filter(r => !r.hasImage).length;
  }, [excelValidation]);

  // Can proceed if:
  // 1. All required images are uploaded, OR
  // 2. User chose to skip images
  const canProceedToReview = excelValidation && 
    excelValidation.valid.length > 0 && 
    (missingImages.length === 0 || skipImagesStep);

  const handleSkipImages = () => {
    setSkipImagesStep(true);
    setStep('review');
  };

  const handleImport = async () => {
    if (!excelValidation || !canProceedToReview) return;

    try {
      setImporting(true);
      setStep('importing');
      setImportProgress(0);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const validRows = excelValidation.valid;
      let importedCount = 0;

      // Clean folder path
      const cleanModuleCode = moduleCode.replace(/[^a-zA-Z0-9-_]/g, '_');
      const cleanChapterTitle = chapterTitle.replace(/[^a-zA-Z0-9-_]/g, '_');
      const storageBasePath = `${cleanModuleCode}/${cleanChapterTitle}`;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        try {
          let publicUrl: string | null = null;

          // Only upload image if filename was specified and image exists
          if (row.imageFilename && !skipImagesStep) {
            const imageFile = uploadedImages.get(row.imageFilename);
            if (imageFile) {
              // Upload image to storage
              const ext = row.imageFilename.split('.').pop()?.toLowerCase() || 'jpg';
              const timestamp = Date.now();
              const randomSuffix = Math.random().toString(36).substring(2, 8);
              const newFilename = `${timestamp}-${randomSuffix}.${ext}`;
              const fullStoragePath = `${storageBasePath}/${newFilename}`;

              const { error: uploadError } = await supabase.storage
                .from('osce-images')
                .upload(fullStoragePath, imageFile, {
                  contentType: imageFile.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                });

              if (uploadError) {
                console.error(`Failed to upload image for row ${row.rowNumber}:`, uploadError);
                // Continue without image
              } else {
                const { data: { publicUrl: url } } = supabase.storage
                  .from('osce-images')
                  .getPublicUrl(fullStoragePath);
                publicUrl = url;
              }
            }
          }

          // Resolve section ID from parsed section info
          const sectionId = resolveSectionId(sections, row.sectionName, row.sectionNumber);
          
          // Insert OSCE question (image_url can be null)
          const { error: insertError } = await supabase.from('osce_questions').insert({
            module_id: moduleId,
            chapter_id: chapterId || null,
            section_id: sectionId,
            image_url: publicUrl,
            history_text: row.historyText,
            statement_1: row.statements[0],
            statement_2: row.statements[1],
            statement_3: row.statements[2],
            statement_4: row.statements[3],
            statement_5: row.statements[4],
            answer_1: row.answers[0],
            answer_2: row.answers[1],
            answer_3: row.answers[2],
            answer_4: row.answers[3],
            answer_5: row.answers[4],
            explanation_1: row.explanations[0] || null,
            explanation_2: row.explanations[1] || null,
            explanation_3: row.explanations[2] || null,
            explanation_4: row.explanations[3] || null,
            explanation_5: row.explanations[4] || null,
            display_order: importedCount,
            created_by: session.user.id,
          });

          if (insertError) {
            console.error(`Failed to insert row ${row.rowNumber}:`, insertError);
            continue;
          }

          importedCount++;
        } catch (err) {
          console.error(`Error processing row ${row.rowNumber}:`, err);
        }

        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      toast.success(`Successfully imported ${importedCount} OSCE questions`);
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-questions', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-osce-questions', moduleId] });
      
      // Activity logging for bulk upload
      logActivity({
        action: 'bulk_upload_osce',
        entity_type: 'osce',
        scope: { module_id: moduleId, chapter_id: chapterId },
        metadata: { source: 'csv_import', count: importedCount },
      });
      
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import questions');
      setStep('review');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    const headers = [
      'image_filename',
      'case_history',
      'statement_1_text',
      'statement_1_answer',
      'statement_2_text',
      'statement_2_answer',
      'statement_3_text',
      'statement_3_answer',
      'statement_4_text',
      'statement_4_answer',
      'statement_5_text',
      'statement_5_answer',
      'explanation_1',
      'explanation_2',
      'explanation_3',
      'explanation_4',
      'explanation_5',
      'section_name',
      'section_number',
    ];
    
    // Example with image
    const exampleRowWithImage = [
      'case_001.jpg',
      'A 45-year-old male presents with chest pain radiating to the left arm...',
      'The patient has typical angina symptoms',
      'TRUE',
      'ECG changes are diagnostic of myocardial infarction',
      'FALSE',
      'Troponin levels would be elevated in acute MI',
      'TRUE',
      'Beta-blockers are contraindicated in this patient',
      'FALSE',
      'Aspirin should be given immediately',
      'TRUE',
      'Classic angina presents with chest pain on exertion',
      'ECG may be normal in early stages',
      'Troponin is a sensitive marker for myocardial damage',
      'Beta-blockers are actually indicated unless contraindicated',
      'Aspirin reduces mortality in acute coronary syndrome',
      'Cardiology Basics', // section_name
      '1', // section_number
    ];

    // Example without image (image_filename is optional)
    const exampleRowWithoutImage = [
      '', // Empty = no image required
      'A 28-year-old woman presents with fatigue and pallor...',
      'Iron deficiency is the most common cause of anemia',
      'TRUE',
      'Vitamin B12 deficiency causes microcytic anemia',
      'FALSE',
      'Reticulocyte count helps assess bone marrow response',
      'TRUE',
      'Hemolysis can be excluded with normal LDH',
      'FALSE',
      'Ferritin is the best initial test for iron stores',
      'TRUE',
      'Iron deficiency is common especially in women',
      'B12 deficiency causes macrocytic anemia',
      'Reticulocytes indicate bone marrow response',
      'LDH can be elevated in hemolysis',
      'Ferritin reflects total body iron stores',
      '', // section_name (optional)
      '', // section_number (optional)
    ];

    const data = [headers, exampleRowWithImage, exampleRowWithoutImage];
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 20 }, // image_filename
      { wch: 60 }, // case_history
      { wch: 40 }, // statement_1_text
      { wch: 12 }, // statement_1_answer
      { wch: 40 }, // statement_2_text
      { wch: 12 }, // statement_2_answer
      { wch: 40 }, // statement_3_text
      { wch: 12 }, // statement_3_answer
      { wch: 40 }, // statement_4_text
      { wch: 12 }, // statement_4_answer
      { wch: 40 }, // statement_5_text
      { wch: 12 }, // statement_5_answer
      { wch: 40 }, // explanation_1
      { wch: 40 }, // explanation_2
      { wch: 40 }, // explanation_3
      { wch: 40 }, // explanation_4
      { wch: 40 }, // explanation_5
      { wch: 20 }, // section_name
      { wch: 15 }, // section_number
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'OSCE Questions');
    XLSX.writeFile(wb, 'osce_template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload OSCE Questions</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={step === 'excel' ? 'default' : 'secondary'} className="gap-1">
            1. Excel
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step === 'images' ? 'default' : 'secondary'} className="gap-1">
            2. Images
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step === 'review' || step === 'importing' ? 'default' : 'secondary'} className="gap-1">
            3. Import
          </Badge>
        </div>

        {/* Step 1: Excel Upload */}
        {step === 'excel' && (
          <div className="space-y-4 pt-2">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p><strong>Step 1: Upload Excel file with OSCE questions</strong></p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Download the template and fill in your questions</li>
                  <li>Each row = 1 OSCE question with 5 True/False statements</li>
                  <li><code className="bg-muted px-1 rounded">image_filename</code> is <strong>optional</strong>. Leave blank for questions without images.</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Excel Template (.xlsx)
            </Button>

            <DragDropZone
              id="osce-excel-upload"
              onFileSelect={handleExcelSelect}
              accept=".xlsx"
              acceptedTypes={['.xlsx']}
              fileName={excelFile?.name}
              maxSizeMB={20}
            />

            {/* AI Analyzer */}
            {excelFile && parsedHeaders.length > 0 && (
              <BulkUploadAnalyzer
                isAnalyzing={isAnalyzing}
                analysis={analysis}
                onAnalyze={() => analyzeFile('osce', parsedHeaders, parsedRows)}
                disabled={!excelFile}
              />
            )}

            {/* Excel validation results */}
            {excelValidation && (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Valid: {excelValidation.valid.length}
                  </Badge>
                  {excelValidation.invalid.length > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Invalid: {excelValidation.invalid.length}
                    </Badge>
                  )}
                  {questionsWithImages > 0 && (
                    <Badge variant="secondary">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      With images: {questionsWithImages}
                    </Badge>
                  )}
                  {questionsWithoutImages > 0 && (
                    <Badge variant="outline">
                      No image: {questionsWithoutImages}
                    </Badge>
                  )}
                </div>

                {excelValidation.invalid.length > 0 && (
                  <ScrollArea className="h-32 border rounded-lg p-2">
                    {excelValidation.invalid.map((row, idx) => (
                      <div key={idx} className="text-sm text-destructive flex items-start gap-2 mb-1">
                        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Row {row.rowNumber}: {row.error}</span>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  // If no images required, skip to review
                  if (excelValidation && excelValidation.requiredImages.length === 0) {
                    setSkipImagesStep(true);
                    setStep('review');
                  } else {
                    setStep('images');
                  }
                }} 
                disabled={!excelValidation || excelValidation.valid.length === 0}
              >
                {excelValidation && excelValidation.requiredImages.length === 0 
                  ? 'Next: Review & Import' 
                  : 'Next: Upload Images'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Image Upload */}
        {step === 'images' && excelValidation && (
          <div className="space-y-4 pt-2">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p><strong>Step 2: Upload images for questions that require them</strong></p>
                <p className="text-sm mt-1">
                  Images will be stored at: <code className="bg-muted px-1 rounded text-xs">osce-images/{storagePath}</code>
                </p>
                {questionsWithoutImages > 0 && (
                  <p className="text-sm mt-1 text-muted-foreground">
                    Note: {questionsWithoutImages} question(s) have no image specified and will be imported without images.
                  </p>
                )}
              </AlertDescription>
            </Alert>

            {/* Skip images option */}
            {excelValidation.requiredImages.length > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <SkipForward className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Skip images for now?</p>
                    <p className="text-xs text-muted-foreground">
                      Import questions without images. You can add images later.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleSkipImages}>
                  Skip & Import
                </Button>
              </div>
            )}

            {/* Image upload area */}
            <DragDropZone
              id="osce-image-upload"
              onFileSelect={handleImageSelect}
              accept="image/*"
              acceptedTypes={['.jpg', '.jpeg', '.png', '.gif', '.webp']}
              fileName={uploadedImages.size > 0 ? `${uploadedImages.size} image(s) uploaded` : undefined}
              maxSizeMB={20}
            />
            <p className="text-xs text-muted-foreground -mt-2">
              Drop images one at a time, or click to browse and select multiple
            </p>

            {/* Required images checklist */}
            {excelValidation.requiredImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Required images ({uploadedImages.size}/{excelValidation.requiredImages.length}):
                </p>
                <ScrollArea className="h-48 border rounded-lg p-2">
                  {excelValidation.requiredImages.map((filename) => {
                    const isUploaded = uploadedImages.has(filename);
                    return (
                      <div 
                        key={filename} 
                        className={`flex items-center justify-between py-1 px-2 rounded mb-1 ${
                          isUploaded ? 'bg-green-50 dark:bg-green-950/20' : 'bg-amber-50 dark:bg-amber-950/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isUploaded ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          )}
                          <span className={`text-sm ${isUploaded ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {filename}
                          </span>
                        </div>
                        {isUploaded && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeImage(filename)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </ScrollArea>
              </div>
            )}

            {missingImages.length > 0 && !skipImagesStep && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {missingImages.length} image(s) not yet uploaded. Upload them or click "Skip & Import" to proceed without.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('excel')}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('review')} 
                disabled={!canProceedToReview}
              >
                Next: Review & Import
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Import */}
        {step === 'review' && excelValidation && (
          <div className="space-y-4 pt-2">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <p><strong>Ready to import!</strong></p>
                <p className="text-sm mt-1">
                  {excelValidation.valid.length} OSCE questions will be created.
                  {excelValidation.invalid.length > 0 && ` ${excelValidation.invalid.length} invalid rows will be skipped.`}
                </p>
                {skipImagesStep && missingImages.length > 0 && (
                  <p className="text-sm mt-1 text-amber-600 dark:text-amber-400">
                    ⚠️ {missingImages.length} questions will be imported without images. You can add images later.
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-48 border rounded-lg p-3">
              {excelValidation.valid.map((row, idx) => (
                <div key={idx} className="flex items-start gap-2 mb-2 pb-2 border-b last:border-0">
                  <Badge variant="outline" className="shrink-0">#{idx + 1}</Badge>
                  <div className="text-sm flex-1">
                    <div className="flex items-center gap-2">
                      {row.hasImage ? (
                        uploadedImages.has(row.imageFilename) ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <ImageIcon className="w-3 h-3" /> {row.imageFilename}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 text-amber-600">
                            <AlertTriangle className="w-3 h-3" /> No image
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs">No image</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-1 mt-1">
                      {row.historyText.substring(0, 80)}...
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(excelValidation.requiredImages.length > 0 ? 'images' : 'excel')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {excelValidation.valid.length} Questions
              </Button>
            </div>
          </div>
        )}

        {/* Importing */}
        {step === 'importing' && (
          <div className="space-y-4 pt-4 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Importing OSCE questions...</p>
            <Progress value={importProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
