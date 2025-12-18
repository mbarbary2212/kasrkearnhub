import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  StudyResourceType,
  StudyResourceInsert,
  FlashcardContent,
  TableContent,
  AlgorithmContent,
  ExamTipContent,
  useBulkCreateStudyResources,
} from '@/hooks/useStudyResources';
import { toast } from 'sonner';

interface StudyBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  moduleId: string;
  resourceType: StudyResourceType;
}

interface ParsedItem {
  title: string;
  content: FlashcardContent | TableContent | AlgorithmContent | ExamTipContent;
  error?: string;
}

interface ParseError {
  row: number;
  reason: string;
}

const TYPE_LABELS: Record<StudyResourceType, string> = {
  flashcard: 'Flashcards',
  table: 'Key Tables',
  algorithm: 'Algorithms',
  exam_tip: 'Exam Tips',
  key_image: 'Key Images',
};

const CSV_FORMATS: Record<StudyResourceType, string> = {
  flashcard: 'title,front,back\n"Card Title","Question text","Answer text"',
  table: 'title,headers,row1,row2\n"Table Title","Col1|Col2|Col3","Val1|Val2|Val3","Val4|Val5|Val6"',
  algorithm: 'title,steps\n"Algorithm Title","Step 1 title::Step 1 desc|Step 2 title::Step 2 desc"',
  exam_tip: 'title,tips\n"Tips Title","Tip 1|Tip 2|Tip 3"',
  key_image: 'Not supported for bulk upload',
};

export function StudyBulkUploadModal({
  open,
  onOpenChange,
  chapterId,
  moduleId,
  resourceType,
}: StudyBulkUploadModalProps) {
  const bulkCreate = useBulkCreateStudyResources();

  const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
  };

  const processCSV = useCallback(
    (text: string) => {
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setErrors([{ row: 0, reason: 'CSV must have at least a header row and one data row' }]);
        return;
      }

      const parsed: ParsedItem[] = [];
      const parseErrors: ParseError[] = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = parseCSVLine(line);
          const item = parseLineByType(values, resourceType, i + 1);
          if (item.error) {
            parseErrors.push({ row: i + 1, reason: item.error });
          } else {
            parsed.push(item);
          }
        } catch (e) {
          parseErrors.push({ row: i + 1, reason: (e as Error).message });
        }
      }

      setParsedData(parsed);
      setErrors(parseErrors);
    },
    [resourceType]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    try {
      const resources: StudyResourceInsert[] = parsedData.map((item) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        resource_type: resourceType,
        title: item.title,
        content: item.content,
      }));

      await bulkCreate.mutateAsync(resources);
      toast.success(`Imported ${resources.length} items`);
      resetState();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to import resources');
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Upload {TYPE_LABELS[resourceType]}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* CSV Format Example */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">CSV Format:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {CSV_FORMATS[resourceType]}
            </pre>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              {fileName ? (
                <span className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  {fileName}
                </span>
              ) : (
                'Drag and drop a CSV file or click to browse'
              )}
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <Button size="sm" variant="outline" asChild>
              <label htmlFor="csv-upload" className="cursor-pointer">
                Choose File
              </label>
            </Button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  {errors.length} error(s) found:
                </p>
                <ScrollArea className="h-24">
                  <ul className="text-xs space-y-1">
                    {errors.map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.reason}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg">
              <div className="px-4 py-2 bg-muted border-b flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">
                  {parsedData.length} items ready to import
                </span>
              </div>
              <ScrollArea className="h-48">
                <div className="p-2 space-y-1">
                  {parsedData.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm px-2 py-1 bg-accent/30 rounded flex items-center gap-2"
                    >
                      <span className="text-muted-foreground text-xs">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{item.title}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || bulkCreate.isPending}
          >
            {bulkCreate.isPending ? 'Importing...' : `Import ${parsedData.length} Items`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse line based on resource type
function parseLineByType(
  values: string[],
  type: StudyResourceType,
  rowNum: number
): ParsedItem {
  if (values.length < 2) {
    return { title: '', content: { front: '', back: '' }, error: 'Not enough columns' };
  }

  const title = values[0];
  if (!title) {
    return { title: '', content: { front: '', back: '' }, error: 'Title is required' };
  }

  switch (type) {
    case 'flashcard': {
      if (values.length < 3) {
        return { title, content: { front: '', back: '' }, error: 'Flashcard requires title, front, and back' };
      }
      return {
        title,
        content: { front: values[1], back: values[2] } as FlashcardContent,
      };
    }
    case 'table': {
      if (values.length < 3) {
        return { title, content: { headers: [], rows: [] }, error: 'Table requires at least title, headers, and one row' };
      }
      const headers = values[1].split('|').map((h) => h.trim());
      const rows = values.slice(2).map((r) => r.split('|').map((c) => c.trim()));
      return {
        title,
        content: { headers, rows } as TableContent,
      };
    }
    case 'algorithm': {
      if (values.length < 2) {
        return { title, content: { steps: [] }, error: 'Algorithm requires title and steps' };
      }
      const steps = values[1].split('|').map((s) => {
        const [stepTitle, description = ''] = s.split('::').map((x) => x.trim());
        return { title: stepTitle, description };
      });
      return {
        title,
        content: { steps } as AlgorithmContent,
      };
    }
    case 'exam_tip': {
      if (values.length < 2) {
        return { title, content: { tips: [] }, error: 'Exam tips require title and tips' };
      }
      const tips = values[1].split('|').map((t) => t.trim());
      return {
        title,
        content: { tips } as ExamTipContent,
      };
    }
    default:
      return { title: '', content: { front: '', back: '' }, error: `Unsupported type: ${type}` };
  }
}
