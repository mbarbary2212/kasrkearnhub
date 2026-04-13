import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mcq, McqChoice } from '@/hooks/useMcqs';
import { formatDuration } from '@/hooks/useMockExam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  BookOpen, 
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleChapter } from '@/hooks/useChapters';

interface MockExamResultsProps {
  moduleId: string;
  moduleName: string;
  questions: Mcq[];
  userAnswers: Record<string, string>;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  chapters?: ModuleChapter[];
  essayScore?: number;
  essayMaxScore?: number;
}

export function MockExamResults({
  moduleId,
  moduleName,
  questions,
  userAnswers,
  score,
  totalQuestions,
  durationSeconds,
  chapters = [],
  essayScore = 0,
  essayMaxScore = 0,
}: MockExamResultsProps) {
  const navigate = useNavigate();
  const totalScore = score + essayScore;
  const totalMax = totalQuestions + essayMaxScore;
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  // Compute focus areas (group wrong answers by chapter)
  const focusAreas = useMemo(() => {
    const wrongByChapter: Record<string, { chapter: ModuleChapter | null; count: number }> = {};
    
    questions.forEach(q => {
      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.correct_key;
      
      if (!isCorrect) {
        const chapterId = q.chapter_id || 'uncategorized';
        if (!wrongByChapter[chapterId]) {
          const chapter = chapters.find(c => c.id === q.chapter_id) || null;
          wrongByChapter[chapterId] = { chapter, count: 0 };
        }
        wrongByChapter[chapterId].count++;
      }
    });

    return Object.entries(wrongByChapter)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [questions, userAnswers, chapters]);

  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = () => {
    if (percentage >= 90) return 'Excellent work! You have mastered this material.';
    if (percentage >= 80) return 'Great job! You have a strong understanding.';
    if (percentage >= 70) return 'Good effort! Keep reviewing to improve.';
    if (percentage >= 60) return 'You passed! Consider reviewing the focus areas below.';
    return 'Keep studying! Focus on the areas highlighted below.';
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/module/${moduleId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">{moduleName}</p>
          <h1 className="text-2xl font-heading font-semibold">Exam Results</h1>
        </div>
      </div>

      {/* Score Summary */}
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className={cn("text-5xl font-bold", getScoreColor())}>
            {percentage}%
          </CardTitle>
          <CardDescription className="text-lg">
            {score}/{totalQuestions} MCQs correct
            {essayMaxScore > 0 && ` · ${essayScore}/${essayMaxScore} Essay marks`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percentage} className="h-3" />
          <p className="text-center text-muted-foreground">
            {getScoreMessage()}
          </p>
          <div className="flex justify-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Time: {formatDuration(durationSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>{totalQuestions} questions</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Focus Areas */}
      {focusAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Focus Areas
            </CardTitle>
            <CardDescription>
              Topics where you can improve
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {focusAreas.map(area => (
              <div key={area.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {area.chapter 
                      ? `Ch ${area.chapter.chapter_number}: ${area.chapter.title}`
                      : 'General Questions'
                    }
                  </span>
                </div>
                <Badge variant="secondary">{area.count} wrong</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Question Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Review</CardTitle>
          <CardDescription>
            Review each question with explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[question.id];
              const isCorrect = userAnswer === question.correct_key;
              const choices = question.choices || [];

              return (
                <AccordionItem key={question.id} value={question.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <span className="text-sm font-medium">
                        Q{index + 1}. {question.stem.slice(0, 80)}
                        {question.stem.length > 80 ? '...' : ''}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <p className="font-medium">{question.stem}</p>
                    <div className="space-y-2">
                      {choices.map((choice: McqChoice) => {
                        const isUserAnswer = userAnswer === choice.key;
                        const isCorrectAnswer = question.correct_key === choice.key;
                        
                        return (
                          <div
                            key={choice.key}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded border",
                              isCorrectAnswer && "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
                              isUserAnswer && !isCorrectAnswer && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
                              !isUserAnswer && !isCorrectAnswer && "border-muted"
                            )}
                          >
                            <span className="font-semibold">{choice.key}.</span>
                            <span className="flex-1">{choice.text}</span>
                            {isCorrectAnswer && (
                              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {!userAnswer && (
                      <p className="text-sm text-muted-foreground italic">
                        You did not answer this question.
                      </p>
                    )}
                    {question.explanation && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Explanation:</p>
                        <p className="text-sm text-muted-foreground">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => navigate(`/module/${moduleId}`)}
        >
          Back to Module
        </Button>
        <Button 
          className="flex-1"
          onClick={() => navigate(`/module/${moduleId}?section=formative`)}
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
