import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { BulkUploadAnalyzer } from '@/components/admin/BulkUploadAnalyzer';
import { CsvCorrectionPreview } from './CsvCorrectionPreview';
import { useBulkUploadAnalyzer } from '@/hooks/useBulkUploadAnalyzer';
import {
  useBulkCreateMatchingQuestions,
  type MatchingQuestionFormData,
} from '@/hooks/useMatchingQuestions';
import { parseSmartMatchingCsv, type ParseCorrection, type MatchingParsedRow } from '@/lib/csvParser';
import { resolveSectionId } from '@/lib/csvExport';
import { useChapterSections, useTopicSections } from '@/hooks/useSections';

interface MatchingQuestionBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
}

export function MatchingQuestionBulkUploadModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  topicId,
}: MatchingQuestionBulkUploadModalProps) {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<MatchingParsedRow[]>([]);
  const [parseCorrections, setParseCorrections] = useState<ParseCorrection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  
  const { isAnalyzing, analysis, analyzeFile, clearAnalysis } = useBulkUploadAnalyzer();
  const bulkCreateMutation = useBulkCreateMatchingQuestions();
  
  // Get sections based on chapter or topic scope
  const { data: chapterSections = [] } = useChapterSections(chapterId ?? undefined);
  const { data: topicSections = [] } = useTopicSections(topicId ?? undefined);
  const sections = chapterId ? chapterSections : topicSections;

  // Parse CSV text into headers and rows for AI analysis
  const parseCsvForAnalysis = useCallback(() => {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1, 4).map(line => line.split(',').map(c => c.trim()));
    return { headers, rows };
  }, [csvText]);

  const handleParse = () => {
    setError(null);
    try {
      const { parsedRows: rows, corrections } = parseSmartMatchingCsv(csvText);
      setParseCorrections(corrections);
      
      if (rows.length === 0) {
        setError('No valid questions found in CSV');
        return;
      }
      
      // Validate each question
      const invalidQuestions = rows.filter(
        r => r.question.column_a_items.length < 2 || 
             r.question.column_b_items.length < 2 ||
             Object.keys(r.question.correct_matches).length < 2
      );
      
      if (invalidQuestions.length > 0) {
        setError(`${invalidQuestions.length} question(s) have fewer than 2 items or matches`);
        return;
      }

      setParsedRows(rows);
      setStep('preview');
    } catch (e) {
      setError('Error parsing CSV: ' + (e as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      // Resolve section IDs from parsed section info
      const questionsWithSections = parsedRows.map(row => {
        const sectionId = resolveSectionId(sections, row.sectionName, row.sectionNumber);
        return {
          ...row.question,
          section_id: sectionId,
        };
      });
      
      await bulkCreateMutation.mutateAsync({
        questions: questionsWithSections,
        moduleId,
        chapterId,
        topicId,
      });
      onOpenChange(false);
      setCsvText('');
      setParsedRows([]);
      setStep('input');
    } catch (e) {
      setError('Error importing questions: ' + (e as Error).message);
    }
  };

  const handleBack = () => {
    setStep('input');
  };

  const handleClose = () => {
    onOpenChange(false);
    setCsvText('');
    setParsedRows([]);
    setParseCorrections([]);
    setStep('input');
    setError(null);
    clearAnalysis();
  };

  const handleAnalyze = () => {
    const { headers, rows } = parseCsvForAnalysis();
    if (headers.length > 0) {
      analyzeFile('matching', headers, rows);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Matching Questions</DialogTitle>
          <DialogDescription>
            Upload matching questions via CSV format
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CSV Format
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Each row should contain:
                </p>
                <code className="text-xs block bg-background p-2 rounded overflow-x-auto">
                  instruction,item_a_1,item_a_2,item_a_3,item_a_4,item_b_1,item_b_2,item_b_3,item_b_4,match_1,match_2,match_3,match_4,explanation,difficulty,show_explanation,section_name,section_number
                </code>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <p>• <strong>match_N:</strong> Index (1-4) of the Column B item that matches item_a_N</p>
                  <p>• <strong>difficulty:</strong> easy, medium, or hard (optional)</p>
                  <p>• <strong>show_explanation:</strong> true/false (optional, defaults to true)</p>
                  <p>• <strong>section_name/section_number:</strong> Section assignment (optional)</p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 border rounded-lg">
                <h4 className="font-medium mb-2">Example:</h4>
                <code className="text-xs block overflow-x-auto whitespace-pre">
{`Match the terms,Cell,Nucleus,Mitochondria,Ribosome,Powerhouse,Protein synthesis,Control center,Basic unit,2,4,3,1,Basic cell biology,easy,true,Section 1,1`}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  This creates: Cell→Powerhouse, Nucleus→Control center, Mitochondria→Protein synthesis, Ribosome→Basic unit
                </p>
              </div>

              <Textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="Paste your CSV data here..."
                rows={10}
                className="font-mono text-sm"
              />

              {/* AI Analyzer */}
              {csvText.trim() && (
                <BulkUploadAnalyzer
                  isAnalyzing={isAnalyzing}
                  analysis={analysis}
                  onAnalyze={handleAnalyze}
                  disabled={!csvText.trim()}
                />
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={!csvText.trim()}>
                Preview Questions
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="space-y-4">
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  {parsedRows.length} matching question(s) ready to import
                </AlertDescription>
              </Alert>

              {/* Auto-corrections applied preview */}
              {parseCorrections.length > 0 && (
                <CsvCorrectionPreview corrections={parseCorrections} />
              )}

              <div className="max-h-96 overflow-y-auto space-y-4">
                {parsedRows.map((row, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Question {i + 1}</h4>
                        {(row.sectionName || row.sectionNumber) && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Section: {row.sectionName || `#${row.sectionNumber}`}
                          </span>
                        )}
                      </div>
                      {row.question.difficulty && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          row.question.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          row.question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {row.question.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{row.question.instruction}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">Column A:</p>
                        <ul className="list-disc list-inside">
                          {row.question.column_a_items.map(item => (
                            <li key={item.id}>{item.text}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">Column B:</p>
                        <ul className="list-disc list-inside">
                          {row.question.column_b_items.map(item => (
                            <li key={item.id}>{item.text}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={bulkCreateMutation.isPending}
              >
                {bulkCreateMutation.isPending ? 'Importing...' : `Import ${parsedRows.length} Questions`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
