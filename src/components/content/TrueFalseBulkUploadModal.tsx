import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useBulkCreateTrueFalseQuestions,
  parseTrueFalseCsv,
  type TrueFalseFormData,
} from '@/hooks/useTrueFalseQuestions';
import { TrueFalseFormSchema } from '@/lib/validators';
import { SectionWarningBanner } from '@/components/sections/SectionWarningBanner';

interface TrueFalseBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
}

const CSV_TEMPLATE = `statement,correct_answer,explanation,difficulty,section_name,section_number
"The mitral valve separates the left atrium from the left ventricle.",TRUE,"The mitral (bicuspid) valve is located between the left atrium and left ventricle.",easy,"Cardiac Anatomy","1"
"Insulin is produced by the alpha cells of the pancreas.",FALSE,"Insulin is produced by the beta cells. Alpha cells produce glucagon.",medium,"Endocrine","2"
"The normal heart rate in adults is between 60-100 beats per minute.",TRUE,"A resting heart rate of 60-100 bpm is considered normal for adults.",easy,"Cardiac Physiology","3"`;

export function TrueFalseBulkUploadModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  topicId,
}: TrueFalseBulkUploadModalProps) {
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState<{ data: TrueFalseFormData; valid: boolean; errors: string[] }[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkCreateMutation = useBulkCreateTrueFalseQuestions();

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'true_false_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    if (!csvText.trim()) return;
    
    const parsed = parseTrueFalseCsv(csvText);
    
    // Validate each item
    const validated = parsed.map(item => {
      const result = TrueFalseFormSchema.safeParse(item);
      return {
        data: item,
        valid: result.success,
        errors: result.success ? [] : result.error.errors.map(e => e.message),
      };
    });
    
    setPreviewData(validated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileError(null);
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text.trim()) {
          setFileError('The file is empty');
          return;
        }
        setCsvText(text);
        
        // Auto-preview
        const parsed = parseTrueFalseCsv(text);
        if (parsed.length === 0) {
          setFileError('No valid questions found in the file.');
          return;
        }
        
        const validated = parsed.map(item => {
          const result = TrueFalseFormSchema.safeParse(item);
          return {
            data: item,
            valid: result.success,
            errors: result.success ? [] : result.error.errors.map(e => e.message),
          };
        });
        
        setPreviewData(validated);
      } catch {
        setFileError('Failed to parse file');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fakeEvent = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  const handleImport = () => {
    if (!previewData) return;
    
    const validItems = previewData.filter(p => p.valid).map(p => p.data);
    
    if (validItems.length === 0) {
      return;
    }

    bulkCreateMutation.mutate(
      { questions: validItems, moduleId, chapterId, topicId },
      { 
        onSuccess: () => {
          onOpenChange(false);
          setCsvText('');
          setPreviewData(null);
          setFileName(null);
        } 
      }
    );
  };

  const validCount = previewData?.filter(p => p.valid).length ?? 0;
  const invalidCount = previewData?.filter(p => !p.valid).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload True/False Questions</DialogTitle>
          <DialogDescription>
            Upload a CSV file with True/False questions or paste CSV content directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section Warning */}
          <SectionWarningBanner chapterId={chapterId} topicId={topicId} />
          {/* Template Download */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all border-muted-foreground/25 bg-background hover:border-primary/50 hover:bg-muted/50"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              {fileName ? (
                <span className="font-medium text-foreground">{fileName}</span>
              ) : (
                <>
                  <span className="font-medium">Drag & drop</span> a CSV file here, or click to browse
                </>
              )}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>

          {fileError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}

          {/* CSV Text Input */}
          <div className="space-y-2">
            <Label>Or paste CSV content</Label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="statement,correct_answer,explanation,difficulty..."
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {!previewData && (
            <Button onClick={handlePreview} disabled={!csvText.trim()}>
              Preview Data
            </Button>
          )}

          {/* Preview */}
          {previewData && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {previewData.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${item.valid ? 'bg-muted/30' : 'bg-red-50 border-red-200 dark:bg-red-950/20'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.data.statement}</p>
                          <p className="text-xs text-muted-foreground">
                            Answer: <span className="font-medium">{item.data.correct_answer ? 'TRUE' : 'FALSE'}</span>
                            {item.data.difficulty && ` • ${item.data.difficulty}`}
                          </p>
                        </div>
                        {item.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                      </div>
                      {!item.valid && item.errors.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">{item.errors.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPreviewData(null);
                    setCsvText('');
                    setFileName(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={validCount === 0 || bulkCreateMutation.isPending}
                >
                  {bulkCreateMutation.isPending ? 'Importing...' : `Import ${validCount} Questions`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
