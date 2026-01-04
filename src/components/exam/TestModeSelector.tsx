import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  AlertTriangle,
  Play,
  Target,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/hooks/useMockExam';

export type TestMode = 'easy' | 'hard';

interface TestModeSelectorProps {
  totalMcqs: number;
  secondsPerQuestion: number;
  hardModeSecondsPerQuestion?: number; // Optional: different time for hard mode
  onStart: (mode: TestMode, questionCount: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
}

const QUESTION_OPTIONS = [10, 20, 30, 50];

export function TestModeSelector({
  totalMcqs,
  secondsPerQuestion,
  hardModeSecondsPerQuestion,
  onStart,
  onCancel,
  isLoading,
  title = 'Test Yourself',
  subtitle,
}: TestModeSelectorProps) {
  // Use separate time for hard mode if provided
  const effectiveHardModeSeconds = hardModeSecondsPerQuestion ?? secondsPerQuestion;
  const [mode, setMode] = useState<TestMode>('easy');
  const [questionCount, setQuestionCount] = useState<number>(() => {
    // Default to first available option that's <= totalMcqs
    const defaultOption = QUESTION_OPTIONS.find(opt => opt <= totalMcqs);
    return defaultOption || Math.min(10, totalMcqs);
  });

  // Calculate time based on mode and question count
  const effectiveQuestionCount = Math.min(questionCount, totalMcqs);
  const totalTime = mode === 'hard' 
    ? effectiveQuestionCount * effectiveHardModeSeconds 
    : effectiveQuestionCount * secondsPerQuestion;

  // Filter options to only show those possible with available MCQs
  const availableOptions = QUESTION_OPTIONS.filter(opt => opt <= totalMcqs);
  
  // If no standard options fit, allow custom count
  if (availableOptions.length === 0 && totalMcqs > 0) {
    availableOptions.push(totalMcqs);
  }

  const handleStart = () => {
    onStart(mode, effectiveQuestionCount);
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Mode</Label>
          <div className="grid gap-3">
            {/* Easy Mode Card */}
            <div
              onClick={() => setMode('easy')}
              className={cn(
                "relative cursor-pointer rounded-lg border-2 p-4 transition-all",
                mode === 'easy' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  mode === 'easy' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Easy Mode</span>
                    <Badge variant="secondary" className="text-xs">Practice</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Navigate manually with a global timer. Great for learning at your own pace.
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    <li>• Manual Next button navigation</li>
                    <li>• Global countdown timer</li>
                    <li>• Answers hidden until submission</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Hard Mode Card */}
            <div
              onClick={() => setMode('hard')}
              className={cn(
                "relative cursor-pointer rounded-lg border-2 p-4 transition-all",
                mode === 'hard' 
                  ? "border-destructive bg-destructive/5" 
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  mode === 'hard' ? "bg-destructive text-destructive-foreground" : "bg-muted"
                )}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Hard Mode</span>
                    <Badge variant="destructive" className="text-xs">Exam Simulation</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fixed time per question with auto-advance. Simulates real exam pressure.
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    <li>• {effectiveHardModeSeconds}s per question, auto-advances</li>
                    <li>• No going back once time expires</li>
                    <li>• Brief pause between questions</li>
                  </ul>
                </div>
              </div>
              {mode === 'hard' && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    No pausing, no going back. Be prepared!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Count Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Number of Questions</Label>
          <RadioGroup
            value={questionCount.toString()}
            onValueChange={(val) => setQuestionCount(parseInt(val))}
            className="flex flex-wrap gap-2"
          >
            {availableOptions.map((count) => (
              <div key={count}>
                <RadioGroupItem
                  value={count.toString()}
                  id={`q-${count}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`q-${count}`}
                  className={cn(
                    "flex items-center justify-center px-4 py-2 rounded-lg border-2 cursor-pointer transition-all",
                    questionCount === count
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  {count}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {totalMcqs} questions available
          </p>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Badge variant="secondary" className="gap-1">
            <Target className="w-3 h-3" />
            {effectiveQuestionCount} Questions
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(totalTime)}
          </Badge>
          {mode === 'hard' && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              <AlertTriangle className="w-3 h-3" />
              {effectiveHardModeSeconds}s/question
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleStart} 
            className="flex-1 gap-2"
            disabled={isLoading || effectiveQuestionCount === 0}
          >
            <Play className="w-4 h-4" />
            {isLoading ? 'Starting...' : 'Start Test'}
            <ChevronRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
