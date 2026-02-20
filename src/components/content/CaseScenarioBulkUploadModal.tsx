import { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Check, Download } from 'lucide-react';
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
import { DragDropZone } from '@/components/ui/drag-drop-zone';
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

const CSV_TEMPLATE = `title,scenario_text,questions,model_answer,rating
"Chest Pain Assessment","A 55-year-old male presents with crushing substernal chest pain radiating to the left arm for the past 30 minutes. He has a history of hypertension and diabetes.","What is your differential diagnosis?|What investigations would you order?|Outline your management plan.","The differential diagnosis includes acute coronary syndrome (STEMI/NSTEMI), aortic dissection, pulmonary embolism, and pericarditis. Key investigations include ECG, cardiac enzymes, chest X-ray, and D-dimer if indicated.",3`;

const CSV_FORMAT = `title,scenario_text,questions,model_answer,rating
"Case Title","Patient presentation and clinical scenario","Q1|Q2|Q3","Complete model answer",3`;

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
          parseErrors.push({ row: i + 1, reason: 'Requires at least title, scenario_text, questions, model_answer' });
          continue;
        }

        const [title, scenario_text, case_questions, model_answer, ratingStr] = values;

        if (!title || !scenario_text || !case_questions || !model_answer) {
          parseErrors.push({ row: i + 1, reason: 'Missing required fields (title, scenario_text, questions, model_answer)' });
          continue;
        }

        const case_history = scenario_text;

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

  const handleFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  }, [processCSV]);

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

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'case_scenarios_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">CSV Format:</p>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-3 w-3 mr-1" />
                Download Template
              </Button>
            </div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {CSV_FORMAT}
            </pre>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>• <strong>scenario_text:</strong> The patient presentation and clinical scenario</p>
              <p>• <strong>questions:</strong> Separate multiple questions with | (pipe character)</p>
              <p>• <strong>rating:</strong> Optional difficulty rating (1-5)</p>
            </div>
          </div>

          {/* File Upload Area with Drag & Drop */}
          <DragDropZone
            id="case-csv-upload"
            onFileSelect={handleFileSelect}
            accept=".csv"
            fileName={fileName}
            acceptedTypes={['.csv']}
            maxSizeMB={10}
          />

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
