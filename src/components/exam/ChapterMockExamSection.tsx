import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardCheck, 
  Clock, 
  GraduationCap,
  ChevronRight,
  Target,
} from 'lucide-react';
import { useChapterMcqs } from '@/hooks/useMcqs';
import { 
  useMockExamSettings, 
  formatDuration,
} from '@/hooks/useMockExam';
import { MockTimedExam } from './MockTimedExam';

interface ChapterMockExamSectionProps {
  moduleId: string;
  chapterId?: string;
}

export function ChapterMockExamSection({ moduleId, chapterId }: ChapterMockExamSectionProps) {
  const [examStarted, setExamStarted] = useState(false);
  
  // Fetch chapter MCQs and settings
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);

  const isLoading = mcqsLoading || settingsLoading;

  // Calculate exam info based on chapter MCQs
  const mcqCount = mcqs?.length || 0;
  const questionCount = settings ? Math.min(settings.question_count, mcqCount) : Math.min(20, mcqCount);
  const secondsPerQuestion = settings?.seconds_per_question || 60;
  const totalTime = questionCount * secondsPerQuestion;
  const hasEnoughQuestions = mcqCount > 0;

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleExamComplete = () => {
    setExamStarted(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Show the exam interface when started
  if (examStarted && mcqs && mcqs.length > 0) {
    return (
      <MockTimedExam 
        moduleId={moduleId}
        chapterId={chapterId}
        chapterMcqs={mcqs}
        onComplete={handleExamComplete}
        questionCount={questionCount}
        secondsPerQuestion={secondsPerQuestion}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Chapter Test Card */}
      <Card className="hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Test Yourself</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Practice with a timed MCQ test from this chapter
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasEnoughQuestions ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Target className="w-3 h-3" />
                  {questionCount} Questions
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatDuration(totalTime)}
                </Badge>
              </div>
              <Button onClick={handleStartExam} className="w-full gap-2" size="sm">
                <ClipboardCheck className="w-4 h-4" />
                Start Test
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">
                Test is not available yet for this chapter.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No MCQ questions have been added.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
