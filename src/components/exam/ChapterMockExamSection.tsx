import { Skeleton } from '@/components/ui/skeleton';
import { useChapterMcqs } from '@/hooks/useMcqs';
import { useMockExamSettings } from '@/hooks/useMockExam';
import { MockTimedExam } from './MockTimedExam';

interface ChapterMockExamSectionProps {
  moduleId: string;
  chapterId?: string;
}

export function ChapterMockExamSection({ moduleId, chapterId }: ChapterMockExamSectionProps) {
  // Fetch chapter MCQs and settings
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);

  const isLoading = mcqsLoading || settingsLoading;

  // Calculate exam info based on chapter MCQs
  const mcqCount = mcqs?.length || 0;
  const questionCount = settings ? Math.min(settings.question_count, mcqCount) : Math.min(20, mcqCount);
  const secondsPerQuestion = settings?.seconds_per_question || 60;
  const hasEnoughQuestions = mcqCount > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Show message if no questions available
  if (!hasEnoughQuestions) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">
          Test is not available yet for this chapter.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No MCQ questions have been added.
        </p>
      </div>
    );
  }

  // Go directly to mode selection (MockTimedExam handles mode selection internally)
  return (
    <MockTimedExam 
      moduleId={moduleId}
      chapterId={chapterId}
      chapterMcqs={mcqs!}
      onComplete={() => {}}
      questionCount={questionCount}
      secondsPerQuestion={secondsPerQuestion}
    />
  );
}
