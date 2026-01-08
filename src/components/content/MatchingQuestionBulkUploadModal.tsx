import { useState } from 'react';
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
import {
  useBulkCreateMatchingQuestions,
  parseMatchingQuestionsCsv,
  type MatchingQuestionFormData,
} from '@/hooks/useMatchingQuestions';

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
  const [parsedQuestions, setParsedQuestions] = useState<MatchingQuestionFormData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const bulkCreateMutation = useBulkCreateMatchingQuestions();

  const handleParse = () => {
    setError(null);
    try {
      const questions = parseMatchingQuestionsCsv(csvText);
      if (questions.length === 0) {
        setError('No valid questions found in CSV');
        return;
      }
      
      // Validate each question
      const invalidQuestions = questions.filter(
        q => q.column_a_items.length < 2 || 
             q.column_b_items.length < 2 ||
             Object.keys(q.correct_matches).length < 2
      );
      
      if (invalidQuestions.length > 0) {
        setError(`${invalidQuestions.length} question(s) have fewer than 2 items or matches`);
        return;
      }

      setParsedQuestions(questions);
      setStep('preview');
    } catch (e) {
      setError('Error parsing CSV: ' + (e as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      await bulkCreateMutation.mutateAsync({
        questions: parsedQuestions,
        moduleId,
        chapterId,
        topicId,
      });
      onOpenChange(false);
      setCsvText('');
      setParsedQuestions([]);
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
    setParsedQuestions([]);
    setStep('input');
    setError(null);
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
                  instruction,item_a_1,item_a_2,item_a_3,item_a_4,item_b_1,item_b_2,item_b_3,item_b_4,match_1,match_2,match_3,match_4,explanation,difficulty,show_explanation
                </code>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <p>• <strong>match_N:</strong> Index (1-4) of the Column B item that matches item_a_N</p>
                  <p>• <strong>difficulty:</strong> easy, medium, or hard (optional)</p>
                  <p>• <strong>show_explanation:</strong> true/false (optional, defaults to true)</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium mb-2">Example:</h4>
                <code className="text-xs block overflow-x-auto whitespace-pre">
{`Match the terms,Cell,Nucleus,Mitochondria,Ribosome,Powerhouse,Protein synthesis,Control center,Basic unit,2,4,3,1,Basic cell biology,easy,true`}
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
                  {parsedQuestions.length} matching question(s) ready to import
                </AlertDescription>
              </Alert>

              <div className="max-h-96 overflow-y-auto space-y-4">
                {parsedQuestions.map((q, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Question {i + 1}</h4>
                      {q.difficulty && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{q.instruction}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">Column A:</p>
                        <ul className="list-disc list-inside">
                          {q.column_a_items.map(item => (
                            <li key={item.id}>{item.text}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">Column B:</p>
                        <ul className="list-disc list-inside">
                          {q.column_b_items.map(item => (
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
                {bulkCreateMutation.isPending ? 'Importing...' : `Import ${parsedQuestions.length} Questions`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
