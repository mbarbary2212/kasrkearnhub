import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Lightbulb, 
  Eye, 
  CheckCircle2, 
  MessageCircleQuestion,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuidedExplanationContent } from '@/hooks/useStudyResources';

interface GuidedExplanationViewerProps {
  title: string;
  content: GuidedExplanationContent;
  resourceId?: string;
  onComplete?: () => void;
}

export function GuidedExplanationViewer({ 
  title, 
  content, 
  resourceId,
  onComplete 
}: GuidedExplanationViewerProps) {
  const storageKey = resourceId ? `guided_progress_${resourceId}` : null;
  const hasTracked = useRef<boolean>(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return new Set(JSON.parse(saved) as number[]);
      } catch { /* ignore */ }
    }
    return new Set();
  });
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const questions = content.guided_questions || [];
  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((revealedAnswers.size / questions.length) * 100) : 0;

  // Track completion when all questions have been answered
  useEffect(() => {
    if (questions.length > 0 && revealedAnswers.size === questions.length) {
      if (!hasTracked.current) {
        hasTracked.current = true;
        onComplete?.();
      }
    }
  }, [revealedAnswers.size, questions.length, onComplete]);

  // Persist revealed answers to localStorage
  const updateRevealedAnswers = (updater: (prev: Set<number>) => Set<number>) => {
    setRevealedAnswers(prev => {
      const next = updater(prev);
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* ignore */ }
      }
      return next;
    });
  };

  const handleRevealAnswer = () => {
    updateRevealedAnswers(prev => new Set([...prev, currentIndex]));
  };

  const handleNext = () => {
    setShowHint(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (!isComplete) {
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    setShowHint(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isAnswerRevealed = revealedAnswers.has(currentIndex);

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No guided questions available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden flex flex-col max-h-full">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Guided Discovery Learning
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-background">
            {revealedAnswers.size} / {questions.length} answered
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-4" />
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
        {/* Introduction */}
        {currentIndex === 0 && !isComplete && content.introduction && (
          <div className="p-4 bg-muted/30 border-b">
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.introduction}
              </p>
            </div>
          </div>
        )}

        {/* Question Area */}
        {!isComplete && currentQuestion && (
          <div className="p-6 space-y-6">
            {/* Question Counter */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
              </span>
              {isAnswerRevealed && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Answered
                </Badge>
              )}
            </div>

            {/* Question */}
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
              <p className="text-lg font-medium leading-relaxed">
                🤔 "{currentQuestion.question}"
              </p>
            </div>

            {/* Hint Section */}
            {currentQuestion.hint && !isAnswerRevealed && (
              <div className="space-y-2">
                {!showHint ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint(true)}
                    className="gap-2"
                  >
                    <Lightbulb className="w-4 h-4" />
                    Show Hint
                  </Button>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {currentQuestion.hint}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Reveal Answer Button */}
            {!isAnswerRevealed && (
              <Button
                onClick={handleRevealAnswer}
                className="w-full gap-2"
                size="lg"
              >
                <Eye className="w-4 h-4" />
                Click to Reveal Answer
              </Button>
            )}

            {/* Answer Section */}
            {isAnswerRevealed && (
              <div 
                className={cn(
                  "p-4 bg-green-500/10 rounded-lg border border-green-500/20",
                  "animate-fade-in"
                )}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Answer:
                    </p>
                    <p className="text-foreground leading-relaxed">
                      {currentQuestion.reveal_answer}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary View */}
        {isComplete && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Well Done!</h3>
              <p className="text-muted-foreground">
                You've completed all the guided questions.
              </p>
            </div>

            {content.summary && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {content.summary}
                </p>
              </div>
            )}

            {content.key_takeaways && content.key_takeaways.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-4">
                <h4 className="font-medium mb-3">Key Takeaways</h4>
                <ul className="space-y-2">
                  {content.key_takeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setCurrentIndex(0);
                setIsComplete(false);
                updateRevealedAnswers(() => new Set());
                setShowHint(false);
              }}
              className="w-full"
            >
              Review Again
            </Button>
          </div>
        )}

        {/* Navigation */}
        {!isComplete && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/30">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={!isAnswerRevealed}
              className="gap-2"
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Complete
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
