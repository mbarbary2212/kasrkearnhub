import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, Printer, Eye, EyeOff, CheckCircle, ListChecks } from 'lucide-react';
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
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { getExpectedPoints } from '@/types/essayRubric';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Essay {
  id: string;
  title: string;
  question: string;
  model_answer?: string | null;
  rating?: number | null;
  chapter_id?: string | null;
  rubric_json?: unknown | null;
  max_points?: number | null;
}

interface EssayDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  essays: Essay[];
  initialIndex: number;
  markedIds?: Set<string>;
  onToggleMark?: (id: string) => void;
  isAdmin?: boolean;
}

/**
 * Fetch the model_answer on-demand for a specific essay.
 * This enforces strict answer isolation — model_answer is never in list queries.
 */
function useEssayModelAnswer(essayId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['essay-model-answer', essayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('model_answer')
        .eq('id', essayId!)
        .single();
      if (error) throw error;
      return data?.model_answer as string | null;
    },
    enabled: !!essayId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function EssayDetailModal({
  open,
  onOpenChange,
  essays,
  initialIndex,
  markedIds,
  onToggleMark,
  isAdmin = false,
}: EssayDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showAnswer, setShowAnswer] = useState(false);
  const completedEssays = useRef<Set<string>>(new Set());
  const { markComplete } = useMarkItemComplete();
  
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setShowAnswer(false);
    }
  }, [open, initialIndex]);

  const essay = essays[currentIndex];

  // Fetch model_answer on-demand only when "Show Answer" is clicked
  const { data: fetchedModelAnswer, isLoading: answerLoading } = useEssayModelAnswer(
    essay?.id,
    showAnswer
  );

  // Use fetched answer, or fall back to essay.model_answer if it was passed (admin context)
  const modelAnswer = fetchedModelAnswer ?? essay?.model_answer;

  // Get expected points from rubric
  const expectedPoints = essay ? getExpectedPoints(essay.rubric_json) : null;

  // Mark as complete when answer is shown
  useEffect(() => {
    if (showAnswer && essay && !completedEssays.current.has(essay.id) && !isAdmin && essay.chapter_id) {
      markComplete(essay.id, 'essay', essay.chapter_id);
      completedEssays.current.add(essay.id);
    }
  }, [showAnswer, essay, isAdmin, markComplete]);

  const goNext = () => {
    if (currentIndex < essays.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
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
        ${modelAnswer ? `
        <div class="section">
          <div class="section-label">Answer:</div>
          <div class="section-content">${modelAnswer}</div>
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
      <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pr-8 shrink-0">
          <div className="flex items-center gap-2 flex-1">
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

            {/* Points to Cover Badge */}
            {expectedPoints && (
              <div className="flex justify-center">
                <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
                  <ListChecks className="h-3.5 w-3.5" />
                  Cover the main key points (≈ {expectedPoints})
                </Badge>
              </div>
            )}

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

            {/* Answer Section - Only shown when toggled, fetched on-demand */}
            {showAnswer && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Answer
                </h3>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  {answerLoading ? (
                    <p className="text-muted-foreground italic">Loading answer...</p>
                  ) : modelAnswer ? (
                    <p className="text-foreground whitespace-pre-wrap">{modelAnswer}</p>
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
