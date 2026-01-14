import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircleQuestion, ArrowRight, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useChapterStudyResources, StudyResource, GuidedExplanationContent } from '@/hooks/useStudyResources';
import { ConceptCheckQuestion } from './ConceptCheckQuestion';
import { gradeWithRubric } from '@/lib/rubricMarking';
import { VPRubric, VPRubricResult } from '@/types/virtualPatient';
import { useSaveConceptCheckAttempt } from '@/hooks/useConceptCheckProgress';
import { cn } from '@/lib/utils';

interface ConceptCheckPracticeProps {
  chapterId: string;
  moduleId: string;
}

interface FlattenedQuestion {
  resourceId: string;
  resourceTitle: string;
  questionIndex: number;
  question: string;
  hint?: string;
  reveal_answer: string;
  rubric?: VPRubric;
}

interface AttemptResult {
  question: FlattenedQuestion;
  result: VPRubricResult;
  userAnswer: string;
}

export function ConceptCheckPractice({ chapterId, moduleId }: ConceptCheckPracticeProps) {
  const { data: studyResources, isLoading } = useChapterStudyResources(chapterId);
  const saveAttempt = useSaveConceptCheckAttempt();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptResults, setAttemptResults] = useState<AttemptResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Flatten all guided explanations with rubrics into individual questions
  const flattenedQuestions = useMemo(() => {
    if (!studyResources) return [];
    
    const questions: FlattenedQuestion[] = [];
    
    studyResources
      .filter(r => r.resource_type === 'guided_explanation')
      .forEach(resource => {
        const content = resource.content as GuidedExplanationContent;
        content.guided_questions?.forEach((q, idx) => {
          // Only include questions that have rubrics
          if (q.rubric && q.rubric.required_concepts?.length > 0) {
            questions.push({
              resourceId: resource.id,
              resourceTitle: content.topic || resource.title || 'Guided Explanation',
              questionIndex: idx,
              question: q.question,
              hint: q.hint,
              reveal_answer: q.reveal_answer,
              rubric: q.rubric as VPRubric,
            });
          }
        });
      });
    
    return questions;
  }, [studyResources]);

  const currentQuestion = flattenedQuestions[currentIndex];
  const isLastQuestion = currentIndex === flattenedQuestions.length - 1;

  const handleSubmit = (answer: string): VPRubricResult => {
    if (!currentQuestion?.rubric) {
      // Fallback if no rubric (shouldn't happen)
      return {
        is_correct: true,
        score: 1,
        matched_required: [],
        missing_required: [],
        matched_optional: [],
      };
    }

    const result = gradeWithRubric(answer, currentQuestion.rubric);
    
    // Save the attempt
    setAttemptResults(prev => [...prev, {
      question: currentQuestion,
      result,
      userAnswer: answer,
    }]);

    // Save to database
    saveAttempt.mutate({
      questionId: `${currentQuestion.resourceId}_${currentQuestion.questionIndex}`,
      chapterId,
      isCorrect: result.is_correct,
      score: result.score,
    });

    return result;
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAttemptResults([]);
    setIsComplete(false);
    setHasStarted(true);
  };

  const handleStart = () => {
    setHasStarted(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // No questions available
  if (flattenedQuestions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircleQuestion className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Concept Check Questions Available</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Guided explanations with practice rubrics will appear here when added by instructors.
        </p>
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    const correctCount = attemptResults.filter(r => r.result.is_correct).length;
    const totalQuestions = attemptResults.length;
    const overallScore = Math.round((attemptResults.reduce((sum, r) => sum + r.result.score, 0) / totalQuestions) * 100);
    const isPassing = overallScore >= 60;

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className={cn(
          "border-2",
          isPassing ? "border-green-500/30" : "border-amber-500/30"
        )}>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
                isPassing ? "bg-green-500" : "bg-amber-500"
              )}>
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {isPassing ? "Great Job!" : "Good Effort!"}
                </h2>
                <p className="text-muted-foreground">
                  You completed {totalQuestions} concept check questions
                </p>
              </div>
              <div className="flex items-center justify-center gap-6 py-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{overallScore}%</p>
                  <p className="text-xs text-muted-foreground">Overall Score</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{correctCount}</p>
                  <p className="text-xs text-muted-foreground">Questions Passed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Results by Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attemptResults.map((attempt, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  attempt.result.is_correct ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  {attempt.result.is_correct ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attempt.question.resourceTitle}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {attempt.question.question}
                  </p>
                </div>
                <Badge variant={attempt.result.is_correct ? "default" : "secondary"}>
                  {Math.round(attempt.result.score * 100)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Retry Button */}
        <div className="flex justify-center">
          <Button onClick={handleRestart} variant="outline" size="lg">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Start screen
  if (!hasStarted) {
    return (
      <Card>
        <CardContent className="pt-8 text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <MessageCircleQuestion className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Concept Check</h2>
            <p className="text-muted-foreground">
              Test your understanding with {flattenedQuestions.length} essay-style questions.
              Write your answers and receive instant feedback on key concepts.
            </p>
          </div>
          <Alert>
            <AlertDescription className="text-sm">
              Your answers will be graded based on required concepts. 
              You need to mention at least 60% of the key concepts to pass each question.
            </AlertDescription>
          </Alert>
          <Button onClick={handleStart} size="lg">
            Start Practice
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active question
  return (
    <div className="space-y-4">
      {/* Topic Badge */}
      <Badge variant="outline" className="text-xs">
        📚 {currentQuestion?.resourceTitle}
      </Badge>

      {/* Current Question */}
      {currentQuestion && (
        <ConceptCheckQuestion
          question={{
            question: currentQuestion.question,
            hint: currentQuestion.hint,
            reveal_answer: currentQuestion.reveal_answer,
            rubric: currentQuestion.rubric,
          }}
          questionNumber={currentIndex + 1}
          totalQuestions={flattenedQuestions.length}
          onSubmit={handleSubmit}
          onNext={handleNext}
          isLastQuestion={isLastQuestion}
        />
      )}
    </div>
  );
}
