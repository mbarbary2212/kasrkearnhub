import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useChapterMcqs, useTopicMcqs } from '@/hooks/useMcqs';
import { useChapterOsceQuestions, useTopicOsceQuestions } from '@/hooks/useOsceQuestions';
import { useMockExamSettings } from '@/hooks/useMockExam';
import { MockTimedExam } from './MockTimedExam';
import { OsceTimedExam } from './OsceTimedExam';
import { ShortEssayExam } from './ShortEssayExam';
import { FileQuestion, Stethoscope, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChapterMockExamSectionProps {
  moduleId: string;
  chapterId?: string;
  topicId?: string;
}

type ContentType = 'mcq' | 'osce' | 'short_essay';

// Fetch essays for exam — strict answer isolation: no model_answer
function useExamEssays(chapterId?: string, topicId?: string) {
  return useQuery({
    queryKey: ['exam-essays', chapterId, topicId],
    queryFn: async () => {
      let query = supabase
        .from('essays')
        .select('id, title, question, rubric_json, max_points')
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (chapterId) query = query.eq('chapter_id', chapterId);
      else if (topicId) query = query.eq('topic_id', topicId);
      else return [];

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(chapterId || topicId),
  });
}

export function ChapterMockExamSection({ moduleId, chapterId, topicId }: ChapterMockExamSectionProps) {
  const [contentType, setContentType] = useState<ContentType>('mcq');

  const { data: chapterMcqs, isLoading: chapterMcqsLoading } = useChapterMcqs(chapterId);
  const { data: topicMcqs, isLoading: topicMcqsLoading } = useTopicMcqs(topicId);
  const { data: chapterOsce, isLoading: chapterOsceLoading } = useChapterOsceQuestions(chapterId);
  const { data: topicOsce, isLoading: topicOsceLoading } = useTopicOsceQuestions(topicId);
  const { data: essays, isLoading: essaysLoading } = useExamEssays(chapterId, topicId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);

  const mcqs = chapterId ? chapterMcqs : topicMcqs;
  const osceQuestions = chapterId ? chapterOsce : topicOsce;
  const mcqsLoading = chapterId ? chapterMcqsLoading : topicMcqsLoading;
  const osceLoading = chapterId ? chapterOsceLoading : topicOsceLoading;

  const isLoading = mcqsLoading || osceLoading || essaysLoading || settingsLoading;

  const mcqCount = mcqs?.length || 0;
  const osceCount = osceQuestions?.length || 0;
  const essayCount = essays?.length || 0;
  
  const hasMcqs = mcqCount > 0;
  const hasOsce = osceCount > 0;
  const hasEssays = essayCount > 0;
  const hasAnyContent = hasMcqs || hasOsce || hasEssays;

  const availableTypes = useMemo(() => {
    const types: ContentType[] = [];
    if (hasMcqs) types.push('mcq');
    if (hasOsce) types.push('osce');
    if (hasEssays) types.push('short_essay');
    return types;
  }, [hasMcqs, hasOsce, hasEssays]);

  // Auto-select first available type
  useMemo(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(contentType)) {
      setContentType(availableTypes[0]);
    }
  }, [availableTypes]);

  const questionCount = settings ? Math.min(settings.question_count, mcqCount) : Math.min(20, mcqCount);
  const secondsPerQuestion = settings?.seconds_per_question || 60;

  const entityLabel = chapterId ? 'chapter' : 'topic';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full max-w-sm mx-auto" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!hasAnyContent) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">
          Test is not available yet for this {entityLabel}.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No MCQ, OSCE, or Short Questions have been added.
        </p>
      </div>
    );
  }

  // If only one type exists, go directly
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
    if (hasEssays) {
      return <ShortEssayExam questions={essays!} onComplete={() => {}} chapterId={chapterId} />;
    }
  }

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
        {hasEssays && (
          <button
            onClick={() => setContentType('short_essay')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors border",
              contentType === 'short_essay'
                ? "bg-violet-500 text-white font-medium shadow-sm border-violet-500"
                : "border-violet-200 text-violet-600 bg-violet-50 hover:bg-violet-100"
            )}
          >
            <PenTool className="w-4 h-4" />
            Short Questions
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{essayCount}</Badge>
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

      {contentType === 'short_essay' && hasEssays && (
        <ShortEssayExam questions={essays!} onComplete={() => {}} chapterId={chapterId} />
      )}
    </div>
  );
}
