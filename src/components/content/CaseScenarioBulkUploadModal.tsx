import { useState, useCallback, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkCreateCaseScenarios, CaseScenarioInsert } from '@/hooks/useCaseScenarios';
import { toast } from 'sonner';

interface CaseScenarioBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  moduleId: string;
}

interface ParsedCase {
  title: string;
  case_history: string;
  case_questions: string;
  model_answer: string;
  rating: number | null;
}

interface ParseError {
  row: number;
  reason: string;
}

interface ParsedItem {
  item: ParsedCase;
  status: 'pending' | 'skip';
}

const CSV_FORMAT = `title,case_history,case_questions,model_answer,rating
"Case Title","Patient history and presentation text","Q1|Q2|Q3","Complete model answer",3`;

export function CaseScenarioBulkUploadModal({
  open,
  onOpenChange,
  chapterId,
  moduleId,
}: CaseScenarioBulkUploadModalProps) {
  const bulkCreate = useBulkCreateCaseScenarios();

  const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
  };

  const processCSV = useCallback((text: string) => {
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
        
        if (values.length < 4) {
          parseErrors.push({ row: i + 1, reason: 'Requires at least title, case_history, case_questions, model_answer' });
          continue;
        }

        const [title, case_history, case_questions, model_answer, ratingStr] = values;

        if (!title || !case_history || !case_questions || !model_answer) {
          parseErrors.push({ row: i + 1, reason: 'Missing required fields' });
          continue;
        }

        const rating = ratingStr ? parseInt(ratingStr, 10) : null;

        parsed.push({
          item: {
            title: title.trim(),
            case_history: case_history.trim(),
            case_questions: case_questions.trim(),
            model_answer: model_answer.trim(),
            rating: rating && !isNaN(rating) && rating >= 1 && rating <= 5 ? rating : null,
          },
          status: 'pending',
        });
      } catch (e) {
        parseErrors.push({ row: i + 1, reason: (e as Error).message });
      }
    }

    setParsedData(parsed);
    setErrors(parseErrors);
  }, []);

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

  const toggleItemStatus = (index: number) => {
    setParsedData(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, status: item.status === 'skip' ? 'pending' : 'skip' }
        : item
    ));
  };

  const itemsToImport = useMemo(() => 
    parsedData.filter(p => p.status !== 'skip').length,
    [parsedData]
  );

  const handleImport = async () => {
    const toImport = parsedData.filter(p => p.status !== 'skip');
    
    if (toImport.length === 0) {
      toast.error('No items to import');
      return;
    }

    try {
      const resources: CaseScenarioInsert[] = toImport.map((item) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        title: item.item.title,
        case_history: item.item.case_history,
        case_questions: item.item.case_questions,
        model_answer: item.item.model_answer,
        rating: item.item.rating,
      }));

      await bulkCreate.mutateAsync(resources);
      toast.success(`Imported ${resources.length} case scenarios`);
      resetState();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to import case scenarios');
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
          <DialogTitle>Bulk Upload Case Scenarios</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* CSV Format Example */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">CSV Format:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {CSV_FORMAT}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              Use | to separate multiple questions in case_questions field.
            </p>
          </div>

          {/* File Upload Area */}
          <div className="rounded-xl border border-dashed border-muted-foreground/25 p-6 text-center bg-background">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {fileName ? (
                <span className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  {fileName}
                </span>
              ) : (
                'Upload a CSV file using the button below.'
              )}
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="case-csv-upload"
            />
            <Button size="sm" variant="outline" asChild>
              <label htmlFor="case-csv-upload" className="cursor-pointer">
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
                  {parsedData.length} items parsed, {itemsToImport} will be imported
                </span>
              </div>
              <ScrollArea className="h-48">
                <div className="p-2 space-y-1">
                  {parsedData.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm px-3 py-2 rounded flex items-center gap-3 bg-accent/30"
                    >
                      <Checkbox
                        checked={item.status !== 'skip'}
                        onCheckedChange={() => toggleItemStatus(index)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {index + 1}.
                          </span>
                          <span className="font-medium truncate">{item.item.title}</span>
                        </div>
                      </div>
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
            disabled={itemsToImport === 0 || bulkCreate.isPending}
          >
            {bulkCreate.isPending ? 'Importing...' : `Import ${itemsToImport} Items`}
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
