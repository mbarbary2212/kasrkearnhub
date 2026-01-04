import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChapterMcqs } from '@/hooks/useMcqs';
import { useChapterOsceQuestions } from '@/hooks/useOsceQuestions';
import { useMockExamSettings } from '@/hooks/useMockExam';
import { MockTimedExam } from './MockTimedExam';
import { OsceTimedExam } from './OsceTimedExam';
import { FileQuestion, Stethoscope } from 'lucide-react';

interface ChapterMockExamSectionProps {
  moduleId: string;
  chapterId?: string;
}

type ContentType = 'mcq' | 'osce';

export function ChapterMockExamSection({ moduleId, chapterId }: ChapterMockExamSectionProps) {
  const [contentType, setContentType] = useState<ContentType>('mcq');

  // Fetch chapter MCQs, OSCEs and settings
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId);
  const { data: osceQuestions, isLoading: osceLoading } = useChapterOsceQuestions(chapterId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);

  const isLoading = mcqsLoading || osceLoading || settingsLoading;

  // Calculate counts
  const mcqCount = mcqs?.length || 0;
  const osceCount = osceQuestions?.length || 0;
  const hasMcqs = mcqCount > 0;
  const hasOsce = osceCount > 0;
  const hasAnyContent = hasMcqs || hasOsce;

  // Settings
  const questionCount = settings ? Math.min(settings.question_count, mcqCount) : Math.min(20, mcqCount);
  const secondsPerQuestion = settings?.seconds_per_question || 60;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full max-w-sm mx-auto" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Show message if no content available
  if (!hasAnyContent) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">
          Test is not available yet for this chapter.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No MCQ or OSCE questions have been added.
        </p>
      </div>
    );
  }

  // If only one type exists, go directly to that exam
  if (hasMcqs && !hasOsce) {
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

  if (hasOsce && !hasMcqs) {
    return (
      <OsceTimedExam 
        moduleId={moduleId}
        chapterId={chapterId}
        osceQuestions={osceQuestions!}
        onComplete={() => {}}
        secondsPerQuestion={90}
      />
    );
  }

  // Both types available - show tabs
  return (
    <div className="space-y-6">
      {/* Content Type Tabs */}
      <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="mcq" className="gap-2">
            <FileQuestion className="w-4 h-4" />
            MCQ
            <Badge variant="secondary" className="ml-1 text-xs">
              {mcqCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="osce" className="gap-2">
            <Stethoscope className="w-4 h-4" />
            OSCE
            <Badge variant="secondary" className="ml-1 text-xs">
              {osceCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="mt-6">
          <MockTimedExam 
            moduleId={moduleId}
            chapterId={chapterId}
            chapterMcqs={mcqs!}
            onComplete={() => {}}
            questionCount={questionCount}
            secondsPerQuestion={secondsPerQuestion}
          />
        </TabsContent>

        <TabsContent value="osce" className="mt-6">
          <OsceTimedExam 
            moduleId={moduleId}
            chapterId={chapterId}
            osceQuestions={osceQuestions!}
            onComplete={() => {}}
            secondsPerQuestion={90}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
