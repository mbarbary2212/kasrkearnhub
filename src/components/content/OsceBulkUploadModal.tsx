import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

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
  error?: string;
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

  const [step, setStep] = useState<'excel' | 'images' | 'review' | 'importing'>('excel');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelValidation, setExcelValidation] = useState<ExcelValidationResult | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Map<string, File>>(new Map());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const storagePath = `${moduleCode}/${chapterTitle}/`;

  const resetState = () => {
    setStep('excel');
    setExcelFile(null);
    setExcelValidation(null);
    setUploadedImages(new Map());
    setImporting(false);
    setImportProgress(0);
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

      // Validate
      const errors: string[] = [];

      if (!imageFilename) errors.push('Missing image_filename');
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

      if (imageFilename) {
        requiredImages.add(imageFilename);
      }

      parsedRows.push({
        rowNumber,
        imageFilename,
        historyText,
        statements,
        answers,
        explanations,
        error: errors.length > 0 ? errors.join('; ') : undefined,
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

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast.error('Please upload an Excel file (.xlsx)');
      return;
    }

    try {
      setExcelFile(file);
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
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = new Map(uploadedImages);
    
    for (const file of Array.from(files)) {
      // Use exact filename (case-sensitive)
      newImages.set(file.name, file);
    }
    
    setUploadedImages(newImages);
    toast.success(`Added ${files.length} image(s)`);
  };

  const removeImage = (filename: string) => {
    const newImages = new Map(uploadedImages);
    newImages.delete(filename);
    setUploadedImages(newImages);
  };

  // Check which images are missing
  const missingImages = useMemo(() => {
    if (!excelValidation) return [];
    return excelValidation.requiredImages.filter(
      filename => !uploadedImages.has(filename)
    );
  }, [excelValidation, uploadedImages]);

  const canProceedToReview = excelValidation && 
    excelValidation.valid.length > 0 && 
    missingImages.length === 0;

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
          // Get the image file
          const imageFile = uploadedImages.get(row.imageFilename);
          if (!imageFile) {
            console.error(`Image not found: ${row.imageFilename}`);
            continue;
          }

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
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('osce-images')
            .getPublicUrl(fullStoragePath);

          // Insert OSCE question
          const { error: insertError } = await supabase.from('osce_questions').insert({
            module_id: moduleId,
            chapter_id: chapterId || null,
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
    ];
    
    const exampleRow = [
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
    ];

    const data = [headers, exampleRow];
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
                  <li><code className="bg-muted px-1 rounded">image_filename</code> must match the exact filename you'll upload</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Excel Template (.xlsx)
            </Button>

            <div>
              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${excelFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}>
                {excelFile ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{excelFile.name}</span>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Click to upload Excel (.xlsx only)</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleExcelChange}
                  className="hidden"
                />
              </label>
            </div>

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
                  <Badge variant="secondary">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Images needed: {excelValidation.requiredImages.length}
                  </Badge>
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
                onClick={() => setStep('images')} 
                disabled={!excelValidation || excelValidation.valid.length === 0}
              >
                Next: Upload Images
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
                <p><strong>Step 2: Upload images for each question</strong></p>
                <p className="text-sm mt-1">
                  Images will be stored at: <code className="bg-muted px-1 rounded text-xs">osce-images/{storagePath}</code>
                </p>
              </AlertDescription>
            </Alert>

            {/* Image upload area */}
            <div>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">Click to select images (can select multiple)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Required images checklist */}
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

            {missingImages.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {missingImages.length} image(s) still missing. Upload all required images to proceed.
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
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-48 border rounded-lg p-3">
              {excelValidation.valid.map((row, idx) => (
                <div key={idx} className="flex items-start gap-2 mb-2 pb-2 border-b last:border-0">
                  <Badge variant="outline" className="shrink-0">#{idx + 1}</Badge>
                  <div className="text-sm">
                    <p className="font-medium">{row.imageFilename}</p>
                    <p className="text-muted-foreground line-clamp-1">
                      {row.historyText.substring(0, 80)}...
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('images')}>
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
