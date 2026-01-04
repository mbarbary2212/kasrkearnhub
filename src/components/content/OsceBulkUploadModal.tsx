import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileSpreadsheet, 
  FolderArchive, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Download,
  Info,
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
  imageFound?: boolean;
}

interface ValidationResult {
  valid: ParsedRow[];
  invalid: ParsedRow[];
  missingImages: string[];
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

  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);

  const storagePath = `${moduleCode}/${chapterTitle}/`;

  const resetState = () => {
    setStep('upload');
    setExcelFile(null);
    setZipFile(null);
    setValidationResult(null);
    setImporting(false);
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Only accept .xlsx files
      if (!file.name.endsWith('.xlsx')) {
        toast.error('Please upload an Excel file (.xlsx)');
        return;
      }
      setExcelFile(file);
    }
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setZipFile(file);
    }
  };

  const handleValidate = async () => {
    if (!excelFile || !zipFile) return;

    try {
      setImporting(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('excel', excelFile);
      formData.append('zip', zipFile);
      formData.append('moduleId', moduleId);
      formData.append('moduleCode', moduleCode);
      formData.append('chapterTitle', chapterTitle);
      if (chapterId) formData.append('chapterId', chapterId);
      formData.append('validateOnly', 'true');

      // Call edge function for validation
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/bulk-import-osce`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      setValidationResult(result);
      setStep('preview');
    } catch (error: any) {
      toast.error(error.message || 'Failed to validate files');
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!excelFile || !zipFile || !validationResult) return;

    try {
      setImporting(true);
      setStep('importing');
      
      // Create form data
      const formData = new FormData();
      formData.append('excel', excelFile);
      formData.append('zip', zipFile);
      formData.append('moduleId', moduleId);
      formData.append('moduleCode', moduleCode);
      formData.append('chapterTitle', chapterTitle);
      if (chapterId) formData.append('chapterId', chapterId);
      formData.append('validateOnly', 'false');

      // Call edge function for import
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/bulk-import-osce`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      toast.success(`Successfully imported ${result.importedCount} OSCE questions`);
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-questions', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-osce-questions', moduleId] });
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import questions');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    const headers = [
      'image_filename',
      'case_history',
      'statement_1_text',
      'statement_1_answer',
      'statement_1_explanation',
      'statement_2_text',
      'statement_2_answer',
      'statement_2_explanation',
      'statement_3_text',
      'statement_3_answer',
      'statement_3_explanation',
      'statement_4_text',
      'statement_4_answer',
      'statement_4_explanation',
      'statement_5_text',
      'statement_5_answer',
      'statement_5_explanation',
    ];
    
    const exampleRow = [
      'case_001.jpg',
      'A 45-year-old male presents with chest pain radiating to the left arm...',
      'The patient has typical angina symptoms',
      'TRUE',
      'Classic angina presents with chest pain on exertion',
      'ECG changes are diagnostic of myocardial infarction',
      'FALSE',
      'ECG may be normal in early stages',
      'Troponin levels would be elevated in acute MI',
      'TRUE',
      'Troponin is a sensitive marker for myocardial damage',
      'Beta-blockers are contraindicated in this patient',
      'FALSE',
      'Beta-blockers are actually indicated unless contraindicated',
      'Aspirin should be given immediately',
      'TRUE',
      'Aspirin reduces mortality in acute coronary syndrome',
    ];

    const data = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 20 }, // image_filename
      { wch: 60 }, // case_history
      { wch: 40 }, // statement_1_text
      { wch: 12 }, // statement_1_answer
      { wch: 40 }, // statement_1_explanation
      { wch: 40 }, // statement_2_text
      { wch: 12 }, // statement_2_answer
      { wch: 40 }, // statement_2_explanation
      { wch: 40 }, // statement_3_text
      { wch: 12 }, // statement_3_answer
      { wch: 40 }, // statement_3_explanation
      { wch: 40 }, // statement_4_text
      { wch: 12 }, // statement_4_answer
      { wch: 40 }, // statement_4_explanation
      { wch: 40 }, // statement_5_text
      { wch: 12 }, // statement_5_answer
      { wch: 40 }, // statement_5_explanation
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'OSCE Questions');

    // Download the file
    XLSX.writeFile(wb, 'osce_template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload OSCE Questions</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 pt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Save images with the <strong>exact names</strong> written in the <code className="bg-muted px-1 rounded">image_filename</code> column.</li>
                  <li>ZIP must contain those exact files (case-sensitive).</li>
                  <li>Images will be uploaded to: <code className="bg-muted px-1 rounded text-xs">osce-images/{storagePath}</code></li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Excel Template (.xlsx)
            </Button>

            {/* Excel Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Step 1: Upload Excel File (.xlsx)
              </label>
              <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${excelFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}>
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

            {/* ZIP Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Step 2: Upload ZIP File with Images
              </label>
              <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${zipFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}>
                {zipFile ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{zipFile.name}</span>
                  </div>
                ) : (
                  <>
                    <FolderArchive className="w-8 h-8 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Click to upload ZIP file with images</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleZipChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleValidate} 
                disabled={!excelFile || !zipFile || importing}
              >
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Validate Files
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && validationResult && (
          <div className="space-y-4 pt-4">
            {/* Summary */}
            <div className="flex gap-4 flex-wrap">
              <Badge variant="default" className="text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Valid: {validationResult.valid.length}
              </Badge>
              {validationResult.invalid.length > 0 && (
                <Badge variant="destructive" className="text-sm">
                  <XCircle className="w-4 h-4 mr-1" />
                  Invalid: {validationResult.invalid.length}
                </Badge>
              )}
              {validationResult.missingImages.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Missing Images: {validationResult.missingImages.length}
                </Badge>
              )}
            </div>

            {/* Errors */}
            {(validationResult.invalid.length > 0 || validationResult.missingImages.length > 0) && (
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {validationResult.invalid.map((row, idx) => (
                    <div key={idx} className="text-sm text-destructive flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Row {row.rowNumber}: {row.error}</span>
                    </div>
                  ))}
                  {validationResult.missingImages.map((filename, idx) => (
                    <div key={`img-${idx}`} className="text-sm text-amber-600 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Missing image in ZIP: <code className="bg-muted px-1 rounded">{filename}</code></span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {validationResult.valid.length === 0 ? (
              <Alert variant="destructive">
                <AlertDescription>
                  No valid rows found. Please fix the errors and try again.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription>
                  Ready to import {validationResult.valid.length} OSCE questions.
                  {validationResult.invalid.length > 0 && ` ${validationResult.invalid.length} rows will be skipped.`}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Images will be stored at: <code className="bg-muted px-1 rounded">osce-images/{storagePath}</code>
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validationResult.valid.length === 0 || importing}
              >
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {validationResult.valid.length} Questions
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 pt-4 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Importing OSCE questions...</p>
            <p className="text-sm text-muted-foreground">This may take a few minutes for large uploads.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
