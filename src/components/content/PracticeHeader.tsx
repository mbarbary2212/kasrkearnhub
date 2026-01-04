import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  RotateCcw, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ChapterAttempt, 
  PracticeQuestionType,
  getPercentileCategory,
} from '@/hooks/useQuestionAttempts';
import { format } from 'date-fns';

interface PracticeHeaderProps {
  questionType: PracticeQuestionType;
  chapterId: string;
  totalQuestions: number;
  attemptedCount: number;
  unattemptedCount: number;
  currentAttemptNumber: number;
  attemptHistory: ChapterAttempt[];
  percentileData: {
    percentile: number | null;
    score: number;
    totalQuestions: number;
  } | null;
  showAttempted: boolean;
  onShowAttemptedChange: (show: boolean) => void;
  onResetAttempt: () => void;
  isResetting: boolean;
}

export function PracticeHeader({
  questionType,
  totalQuestions,
  attemptedCount,
  unattemptedCount,
  currentAttemptNumber,
  attemptHistory,
  percentileData,
  showAttempted,
  onShowAttemptedChange,
  onResetAttempt,
  isResetting,
}: PracticeHeaderProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const completedAttempts = attemptHistory.filter(a => a.is_completed);
  const hasMultipleAttempts = completedAttempts.length >= 2;
  const percentileCategory = getPercentileCategory(percentileData?.percentile ?? null);

  // Calculate improvement between last two attempts
  const getImprovement = () => {
    if (completedAttempts.length < 2) return null;
    const latest = completedAttempts[completedAttempts.length - 1];
    const previous = completedAttempts[completedAttempts.length - 2];
    
    if (!latest || !previous) return null;
    
    // Calculate percentage scores
    const latestPercent = latest.total_questions > 0 
      ? (latest.score / (questionType === 'osce' ? latest.total_questions * 5 : latest.total_questions)) * 100 
      : 0;
    const previousPercent = previous.total_questions > 0 
      ? (previous.score / (questionType === 'osce' ? previous.total_questions * 5 : previous.total_questions)) * 100 
      : 0;
    
    return latestPercent - previousPercent;
  };

  const improvement = getImprovement();

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    onResetAttempt();
  };

  const typeLabel = questionType === 'mcq' ? 'MCQ' : 'OSCE';

  return (
    <div className="space-y-3">
      {/* Main Stats Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-medium">
            Attempt {currentAttemptNumber}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {attemptedCount} of {totalQuestions} attempted
            {unattemptedCount > 0 && (
              <span className="text-primary font-medium ml-1">
                ({unattemptedCount} remaining)
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Show Attempted Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-attempted"
              checked={showAttempted}
              onCheckedChange={onShowAttemptedChange}
            />
            <Label htmlFor="show-attempted" className="text-sm cursor-pointer">
              Include attempted
            </Label>
          </div>

          {/* History Button */}
          {completedAttempts.length > 0 && (
            <Popover open={showHistory} onOpenChange={setShowHistory}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <History className="h-4 w-4" />
                  History
                  {showHistory ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <h4 className="font-medium">Your {typeLabel} Attempts</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {completedAttempts.map((attempt, index) => {
                      const maxScore = questionType === 'osce' 
                        ? attempt.total_questions * 5 
                        : attempt.total_questions;
                      const percent = maxScore > 0 
                        ? Math.round((attempt.score / maxScore) * 100) 
                        : 0;
                      const prevAttempt = completedAttempts[index - 1];
                      let change: number | null = null;
                      
                      if (prevAttempt) {
                        const prevMaxScore = questionType === 'osce' 
                          ? prevAttempt.total_questions * 5 
                          : prevAttempt.total_questions;
                        const prevPercent = prevMaxScore > 0 
                          ? Math.round((prevAttempt.score / prevMaxScore) * 100) 
                          : 0;
                        change = percent - prevPercent;
                      }

                      return (
                        <div 
                          key={attempt.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div>
                            <span className="font-medium text-sm">
                              Attempt {attempt.attempt_number}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {attempt.completed_at 
                                ? format(new Date(attempt.completed_at), 'MMM d, yyyy')
                                : 'In progress'
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{percent}%</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({attempt.score}/{maxScore})
                            </span>
                            {change !== null && (
                              <div className={cn(
                                "text-xs flex items-center justify-end gap-0.5",
                                change > 0 && "text-green-600",
                                change < 0 && "text-red-600",
                                change === 0 && "text-muted-foreground"
                              )}>
                                {change > 0 ? (
                                  <><TrendingUp className="h-3 w-3" /> +{change}%</>
                                ) : change < 0 ? (
                                  <><TrendingDown className="h-3 w-3" /> {change}%</>
                                ) : (
                                  <><Minus className="h-3 w-3" /> Same</>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Reset Button */}
          {attemptedCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetClick}
              disabled={isResetting}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Attempt
            </Button>
          )}
        </div>
      </div>

      {/* Improvement & Percentile Row */}
      {(hasMultipleAttempts || percentileCategory) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Improvement indicator */}
          {improvement !== null && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              improvement > 0 && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              improvement < 0 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              improvement === 0 && "bg-muted text-muted-foreground"
            )}>
              {improvement > 0 ? (
                <><TrendingUp className="h-3.5 w-3.5" /> +{improvement.toFixed(0)}% from last attempt</>
              ) : improvement < 0 ? (
                <><TrendingDown className="h-3.5 w-3.5" /> {improvement.toFixed(0)}% from last attempt</>
              ) : (
                <><Minus className="h-3.5 w-3.5" /> Same as last attempt</>
              )}
            </div>
          )}

          {/* Percentile */}
          {percentileCategory && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
              <Users className="h-3.5 w-3.5" />
              <span>
                {percentileData?.percentile !== null 
                  ? `You scored higher than ${percentileData.percentile}% of students`
                  : percentileCategory
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will save your current attempt as Attempt {currentAttemptNumber} and start fresh.
              Your previous scores and progress will be preserved for comparison.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset}>
              Start New Attempt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
