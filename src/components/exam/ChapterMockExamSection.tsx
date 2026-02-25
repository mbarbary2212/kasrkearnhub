import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="flex gap-2 justify-center flex-wrap mb-6">
          {hasMcqs && (
            <button
              onClick={() => setContentType('mcq')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors border",
                contentType === 'mcq'
                  ? "bg-violet-500 text-white font-medium shadow-sm border-violet-500"
                  : "border-violet-200 text-violet-600 bg-violet-50 hover:bg-violet-100"
              )}
            >
              <FileQuestion className="w-4 h-4" />
              MCQ
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{mcqCount}</Badge>
            </button>
          )}
          {hasOsce && (
            <button
              onClick={() => setContentType('osce')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors border",
                contentType === 'osce'
                  ? "bg-violet-500 text-white font-medium shadow-sm border-violet-500"
                  : "border-violet-200 text-violet-600 bg-violet-50 hover:bg-violet-100"
              )}
            >
              <Stethoscope className="w-4 h-4" />
              OSCE
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{osceCount}</Badge>
            </button>
          )}
        </div>

        {contentType === 'mcq' && hasMcqs && (
            <MockTimedExam 
              moduleId={moduleId}
              chapterId={chapterId}
              chapterMcqs={mcqs!}
              onComplete={() => {}}
              questionCount={questionCount}
              secondsPerQuestion={secondsPerQuestion}
            />
        )}

        {contentType === 'osce' && hasOsce && (
            <OsceTimedExam 
              moduleId={moduleId}
              chapterId={chapterId}
              osceQuestions={osceQuestions!}
              onComplete={() => {}}
              secondsPerQuestion={90}
            />
        )}
    </div>
  );
}