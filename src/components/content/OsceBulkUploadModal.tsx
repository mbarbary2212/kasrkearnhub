import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';

interface OsceBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
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
}: OsceBulkUploadModalProps) {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);

  const resetState = () => {
    setStep('upload');
    setExcelFile(null);
    setZipFile(null);
    setValidationResult(null);
    setImportProgress(0);
    setImporting(false);
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    const headers = [
      'image_filename',
      'history_text',
      'statement_1',
      'answer_1',
      'statement_2',
      'answer_2',
      'statement_3',
      'answer_3',
      'statement_4',
      'answer_4',
      'statement_5',
      'answer_5',
      'explanation_1',
      'explanation_2',
      'explanation_3',
      'explanation_4',
      'explanation_5',
    ];
    
    const exampleRow = [
      'image1.jpg',
      'A 45-year-old male presents with chest pain...',
      'The patient has typical angina symptoms',
      'T',
      'ECG changes are diagnostic of MI',
      'F',
      'Troponin levels would be elevated',
      'T',
      'Beta-blockers are contraindicated',
      'F',
      'Aspirin should be given immediately',
      'T',
      'Explanation for statement 1',
      'Explanation for statement 2',
      'Explanation for statement 3',
      'Explanation for statement 4',
      'Explanation for statement 5',
    ];

    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'osce_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload OSCE Questions</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 pt-4">
            <Alert>
              <AlertDescription>
                Upload an Excel/CSV file with question data and a ZIP file containing the images.
                Image filenames in Excel must match the files in the ZIP exactly.
              </AlertDescription>
            </Alert>

            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            {/* Excel Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Step 1: Upload Excel/CSV File
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
                    <span className="text-sm text-muted-foreground">Click to upload Excel (.xlsx, .csv)</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
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
                    <span className="text-sm text-muted-foreground">Click to upload ZIP file</span>
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
            <div className="flex gap-4">
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
                  {validationResult.invalid.map((row) => (
                    <div key={row.rowNumber} className="text-sm text-destructive flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Row {row.rowNumber}: {row.error}</span>
                    </div>
                  ))}
                  {validationResult.missingImages.map((filename) => (
                    <div key={filename} className="text-sm text-amber-600 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Missing image: {filename}</span>
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
