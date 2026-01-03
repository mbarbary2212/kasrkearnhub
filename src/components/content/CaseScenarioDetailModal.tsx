import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Printer, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CaseScenario {
  id: string;
  title: string;
  case_history: string;
  case_questions: string;
  model_answer: string;
  rating?: number | null;
}

interface CaseScenarioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cases: CaseScenario[];
  initialIndex: number;
  markedIds?: Set<string>;
  onToggleMark?: (id: string) => void;
}

// Parse questions separated by | into numbered list
function parseQuestions(questions: string): string[] {
  if (!questions) return [];
  return questions.split('|').map(q => q.trim()).filter(Boolean);
}

export function CaseScenarioDetailModal({
  open,
  onOpenChange,
  cases,
  initialIndex,
  markedIds,
  onToggleMark,
}: CaseScenarioDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Reset state when modal opens or navigates
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setShowAnswer(false);
    }
  }, [open, initialIndex]);

  const caseItem = cases[currentIndex];

  const goNext = () => {
    if (currentIndex < cases.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false); // Single-focus: collapse answer when navigating
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false); // Single-focus: collapse answer when navigating
    }
  };

  const handlePrint = () => {
    const questions = parseQuestions(caseItem.case_questions);
    const questionsHtml = questions.length > 1 
      ? `<ol>${questions.map(q => `<li>${q}</li>`).join('')}</ol>`
      : `<p>${caseItem.case_questions}</p>`;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${caseItem.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          h1 { font-size: 24px; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
          .section { margin-bottom: 24px; }
          .section-label { font-weight: bold; color: #666; margin-bottom: 8px; }
          .section-content { white-space: pre-wrap; }
          ol { margin: 0; padding-left: 20px; }
          li { margin-bottom: 8px; }
          .rating { margin-top: 16px; }
        </style>
      </head>
      <body>
        <h1>${caseItem.title}</h1>
        <div class="section">
          <div class="section-label">Case History:</div>
          <div class="section-content">${caseItem.case_history}</div>
        </div>
        <div class="section">
          <div class="section-label">Questions:</div>
          ${questionsHtml}
        </div>
        <div class="section">
          <div class="section-label">Model Answer:</div>
          <div class="section-content">${caseItem.model_answer}</div>
        </div>
        ${caseItem.rating ? `
        <div class="rating">
          ${'★'.repeat(caseItem.rating)}${'☆'.repeat(5 - caseItem.rating)}
        </div>
        ` : ''}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!caseItem) return null;

  const questions = parseQuestions(caseItem.case_questions);
  const isMarked = markedIds?.has(caseItem.id) ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <div className="flex items-center gap-2 flex-1">
            {/* Mark for Review star */}
            {onToggleMark && (
              <button
                onClick={() => onToggleMark(caseItem.id)}
                className={cn(
                  'p-1 rounded-full transition-colors hover:bg-muted shrink-0',
                  isMarked ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                )}
                title={isMarked ? 'Remove from review' : 'Mark for review'}
              >
                <Star className={cn('h-5 w-5', isMarked && 'fill-current')} />
              </button>
            )}
            <DialogTitle className="text-xl font-semibold">{caseItem.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            {caseItem.rating && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                {caseItem.rating}/5
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={handlePrint} title="Print">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 py-4">
            {/* Case History Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Case History
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{caseItem.case_history}</p>
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Questions
              </h3>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                {questions.length > 1 ? (
                  <ol className="list-decimal list-inside space-y-2">
                    {questions.map((q, idx) => (
                      <li key={idx} className="text-foreground">{q}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-foreground whitespace-pre-wrap">{caseItem.case_questions}</p>
                )}
              </div>
            </div>

            {/* Show/Hide Answer Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnswer(!showAnswer)}
                className="gap-2"
              >
                {showAnswer ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Answer
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show Answer
                  </>
                )}
              </Button>
            </div>

            {/* Model Answer Section - Only shown when toggled */}
            {showAnswer && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Model Answer
                </h3>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">{caseItem.model_answer}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation Footer */}
        {cases.length > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {cases.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={currentIndex === cases.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
