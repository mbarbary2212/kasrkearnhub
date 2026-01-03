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

interface Essay {
  id: string;
  title: string;
  question: string;
  model_answer?: string | null;
  rating?: number | null;
}

interface EssayDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  essays: Essay[];
  initialIndex: number;
  markedIds?: Set<string>;
  onToggleMark?: (id: string) => void;
}

export function EssayDetailModal({
  open,
  onOpenChange,
  essays,
  initialIndex,
  markedIds,
  onToggleMark,
}: EssayDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Reset state when modal opens or navigates
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setShowAnswer(false);
    }
  }, [open, initialIndex]);

  const essay = essays[currentIndex];

  const goNext = () => {
    if (currentIndex < essays.length - 1) {
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
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${essay.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          h1 { font-size: 24px; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
          .section { margin-bottom: 24px; }
          .section-label { font-weight: bold; color: #666; margin-bottom: 8px; }
          .section-content { white-space: pre-wrap; }
          .rating { display: flex; gap: 4px; margin-top: 16px; }
          .star { color: gold; }
        </style>
      </head>
      <body>
        <h1>${essay.title}</h1>
        <div class="section">
          <div class="section-label">Question:</div>
          <div class="section-content">${essay.question}</div>
        </div>
        ${essay.model_answer ? `
        <div class="section">
          <div class="section-label">Answer:</div>
          <div class="section-content">${essay.model_answer}</div>
        </div>
        ` : ''}
        ${essay.rating ? `
        <div class="rating">
          ${'★'.repeat(essay.rating)}${'☆'.repeat(5 - essay.rating)}
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

  if (!essay) return null;

  const isMarked = markedIds?.has(essay.id) ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-8 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            {/* Mark for Review star */}
            {onToggleMark && (
              <button
                onClick={() => onToggleMark(essay.id)}
                className={cn(
                  'p-1 rounded-full transition-colors hover:bg-muted shrink-0',
                  isMarked ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                )}
                title={isMarked ? 'Remove from review' : 'Mark for review'}
              >
                <Star className={cn('h-5 w-5', isMarked && 'fill-current')} />
              </button>
            )}
            <DialogTitle className="text-xl font-semibold">{essay.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            {essay.rating && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                {essay.rating}/5
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={handlePrint} title="Print">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 py-4 pb-6">
            {/* Question Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Question
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{essay.question}</p>
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

            {/* Answer Section - Only shown when toggled */}
            {showAnswer && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Answer
                </h3>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  {essay.model_answer ? (
                    <p className="text-foreground whitespace-pre-wrap">{essay.model_answer}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No model answer provided.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation Footer */}
        {essays.length > 1 && (
          <div className="flex items-center justify-between pt-4 border-t shrink-0">
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
              {currentIndex + 1} of {essays.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={currentIndex === essays.length - 1}
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
