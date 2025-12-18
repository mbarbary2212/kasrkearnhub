import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBulkCreateFlashcards } from '@/hooks/useFlashcards';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FlashcardBulkUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  moduleId: string;
}

interface ParsedFlashcard {
  front: string;
  back: string;
}

export default function FlashcardBulkUpload({
  open,
  onOpenChange,
  chapterId,
  moduleId,
}: FlashcardBulkUploadProps) {
  const [parsedData, setParsedData] = useState<ParsedFlashcard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);

  const bulkCreateMutation = useBulkCreateFlashcards();

  const processCSV = (text: string) => {
    try {
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        setError('The file is empty');
        setParsedData([]);
        return;
      }

      // Check if first line is header
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('front') && firstLine.includes('back');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const parsed: ParsedFlashcard[] = [];
      const errors: string[] = [];

      dataLines.forEach((line, index) => {
        // Handle CSV with possible quoted values
        const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
        if (!matches || matches.length < 2) {
          errors.push(`Line ${index + (hasHeader ? 2 : 1)}: Invalid format`);
          return;
        }

        const cleanValue = (val: string) => {
          return val
            .replace(/^,/, '')
            .replace(/^"|"$/g, '')
            .replace(/""/g, '"')
            .trim();
        };

        const front = cleanValue(matches[0]);
        const back = cleanValue(matches[1]);

        if (!front || !back) {
          errors.push(`Line ${index + (hasHeader ? 2 : 1)}: Missing front or back value`);
          return;
        }

        parsed.push({ front, back });
      });

      if (errors.length > 0 && parsed.length === 0) {
        setError(errors.join('\n'));
        setParsedData([]);
      } else {
        setParsedData(parsed);
        if (errors.length > 0) {
          setError(`Warning: ${errors.length} line(s) skipped due to invalid format`);
        }
      }
    } catch (err) {
      setError('Failed to parse CSV file');
      setParsedData([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file only');
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    await bulkCreateMutation.mutateAsync({
      flashcards: parsedData,
      chapterId,
      moduleId,
    });

    onOpenChange(false);
    setParsedData([]);
    setFileName(null);
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setParsedData([]);
    setFileName(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Flashcards</DialogTitle>
          <DialogDescription>
            Upload a CSV file with two columns: <code>front</code> and <code>back</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            {fileName ? (
              <p className="text-sm font-medium">{fileName}</p>
            ) : (
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? 'Drop your CSV file here' : 'Click or drag CSV file here'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Format: front,back (with optional header row)
                </p>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{parsedData.length} flashcard(s) ready to import</span>
              </div>
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-3 space-y-2">
                  {parsedData.slice(0, 10).map((card, index) => (
                    <div key={index} className="bg-muted/50 rounded p-2 text-sm">
                      <p className="font-medium">Q: {card.front}</p>
                      <p className="text-muted-foreground">A: {card.back}</p>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... and {parsedData.length - 10} more
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || bulkCreateMutation.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            {bulkCreateMutation.isPending ? 'Importing...' : `Import ${parsedData.length} Flashcards`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
