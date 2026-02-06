import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useChapterMcqs, useTopicMcqs } from '@/hooks/useMcqs';
import { useChapterOsceQuestions, useTopicOsceQuestions } from '@/hooks/useOsceQuestions';
import { useMockExamSettings } from '@/hooks/useMockExam';
import { MockTimedExam } from './MockTimedExam';
import { OsceTimedExam } from './OsceTimedExam';
import { FileQuestion, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterMockExamSectionProps {
  moduleId: string;
  chapterId?: string;
  topicId?: string;
}

type ContentType = 'mcq' | 'osce';

export function ChapterMockExamSection({ moduleId, chapterId, topicId }: ChapterMockExamSectionProps) {
  const [contentType, setContentType] = useState<ContentType>('mcq');

  // Fetch chapter or topic MCQs, OSCEs and settings
  const { data: chapterMcqs, isLoading: chapterMcqsLoading } = useChapterMcqs(chapterId);
  const { data: topicMcqs, isLoading: topicMcqsLoading } = useTopicMcqs(topicId);
  const { data: chapterOsce, isLoading: chapterOsceLoading } = useChapterOsceQuestions(chapterId);
  const { data: topicOsce, isLoading: topicOsceLoading } = useTopicOsceQuestions(topicId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);

  // Use the appropriate data based on whether it's a chapter or topic
  const mcqs = chapterId ? chapterMcqs : topicMcqs;
  const osceQuestions = chapterId ? chapterOsce : topicOsce;
  const mcqsLoading = chapterId ? chapterMcqsLoading : topicMcqsLoading;
  const osceLoading = chapterId ? chapterOsceLoading : topicOsceLoading;

  const isLoading = mcqsLoading || osceLoading || settingsLoading;

  // Calculate counts
  const mcqCount = mcqs?.length || 0;
  const osceCount = osceQuestions?.length || 0;
  
  const hasMcqs = mcqCount > 0;
  const hasOsce = osceCount > 0;
  const hasAnyContent = hasMcqs || hasOsce;

  // Count available content types for grid layout
  const availableTypes = useMemo(() => {
    const types: ContentType[] = [];
    if (hasMcqs) types.push('mcq');
    if (hasOsce) types.push('osce');
    return types;
  }, [hasMcqs, hasOsce]);

  // Settings
  const questionCount = settings ? Math.min(settings.question_count, mcqCount) : Math.min(20, mcqCount);
  const secondsPerQuestion = settings?.seconds_per_question || 60;

  // Label for empty state message
  const entityLabel = chapterId ? 'chapter' : 'topic';

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
          Test is not available yet for this {entityLabel}.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No MCQ or OSCE questions have been added.
        </p>
      </div>
    );
  }

  // If only one type exists, go directly to that exam
  if (availableTypes.length === 1) {
    if (hasMcqs) {
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
    if (hasOsce) {
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
  }

  // Multiple types available - show tabs
  return (
    <div className="space-y-6">
      {/* Content Type Tabs */}
      <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
        <TabsList className={cn("grid w-full max-w-lg mx-auto", "grid-cols-2")}>
          {hasMcqs && (
            <TabsTrigger value="mcq" className="gap-2">
              <FileQuestion className="w-4 h-4" />
              MCQ
              <Badge variant="secondary" className="ml-1 text-xs">
                {mcqCount}
              </Badge>
            </TabsTrigger>
          )}
          {hasOsce && (
            <TabsTrigger value="osce" className="gap-2">
              <Stethoscope className="w-4 h-4" />
              OSCE
              <Badge variant="secondary" className="ml-1 text-xs">
                {osceCount}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {hasMcqs && (
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
        )}

        {hasOsce && (
          <TabsContent value="osce" className="mt-6">
            <OsceTimedExam 
              moduleId={moduleId}
              chapterId={chapterId}
              osceQuestions={osceQuestions!}
              onComplete={() => {}}
              secondsPerQuestion={90}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}