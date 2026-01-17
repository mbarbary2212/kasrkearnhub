import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useChapterMcqs } from '@/hooks/useMcqs';
import { useChapterOsceQuestions } from '@/hooks/useOsceQuestions';
import { useMockExamSettings } from '@/hooks/useMockExam';
import { useChapterStudyResources } from '@/hooks/useStudyResources';
import { useConceptCheckCount } from '@/hooks/useConceptCheckProgress';
import { MockTimedExam } from './MockTimedExam';
import { OsceTimedExam } from './OsceTimedExam';
import { ConceptCheckPractice } from '@/components/practice/ConceptCheckPractice';
import { MobileSectionDropdown } from '@/components/content/MobileSectionDropdown';
import { FileQuestion, Stethoscope, MessageCircleQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterMockExamSectionProps {
  moduleId: string;
  chapterId?: string;
}

type ContentType = 'mcq' | 'osce' | 'concept_check';

export function ChapterMockExamSection({ moduleId, chapterId }: ChapterMockExamSectionProps) {
  const [contentType, setContentType] = useState<ContentType>('mcq');

  // Fetch chapter MCQs, OSCEs, study resources and settings
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId);
  const { data: osceQuestions, isLoading: osceLoading } = useChapterOsceQuestions(chapterId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);
  const { data: studyResources, isLoading: studyResourcesLoading } = useChapterStudyResources(chapterId);

  const isLoading = mcqsLoading || osceLoading || settingsLoading || studyResourcesLoading;

  // Calculate counts
  const mcqCount = mcqs?.length || 0;
  const osceCount = osceQuestions?.length || 0;
  const conceptCheckCount = useConceptCheckCount(chapterId, studyResources);
  
  const hasMcqs = mcqCount > 0;
  const hasOsce = osceCount > 0;
  const hasConceptCheck = conceptCheckCount > 0;
  const hasAnyContent = hasMcqs || hasOsce || hasConceptCheck;

  // Count available content types for grid layout
  const availableTypes = useMemo(() => {
    const types: ContentType[] = [];
    if (hasMcqs) types.push('mcq');
    if (hasOsce) types.push('osce');
    if (hasConceptCheck) types.push('concept_check');
    return types;
  }, [hasMcqs, hasOsce, hasConceptCheck]);

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
          No MCQ, OSCE, or Concept Check questions have been added.
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
    if (hasConceptCheck) {
      return (
        <ConceptCheckPractice 
          chapterId={chapterId!} 
          moduleId={moduleId} 
        />
      );
    }
  }

  // Multiple types available - show tabs
  const gridCols = availableTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  // Build tab options for mobile dropdown
  const tabOptions = useMemo(() => {
    const options: { id: ContentType; label: string; icon: typeof FileQuestion; count: number }[] = [];
    if (hasMcqs) options.push({ id: 'mcq', label: 'MCQ', icon: FileQuestion, count: mcqCount });
    if (hasOsce) options.push({ id: 'osce', label: 'OSCE', icon: Stethoscope, count: osceCount });
    if (hasConceptCheck) options.push({ id: 'concept_check', label: 'Concept Check', icon: MessageCircleQuestion, count: conceptCheckCount });
    return options;
  }, [hasMcqs, hasOsce, hasConceptCheck, mcqCount, osceCount, conceptCheckCount]);

  return (
    <div className="space-y-6">
      {/* Content Type Tabs */}
      <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
        {/* Mobile: Dropdown selector */}
        <div className="md:hidden">
          <MobileSectionDropdown
            tabs={tabOptions}
            activeTab={contentType}
            onTabChange={(tab) => setContentType(tab as ContentType)}
          />
        </div>
        {/* Desktop: Tab list */}
        <TabsList className={cn("hidden md:grid w-full max-w-lg mx-auto", gridCols)}>
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
          {hasConceptCheck && (
            <TabsTrigger value="concept_check" className="gap-2">
              <MessageCircleQuestion className="w-4 h-4" />
              Concept Check
              <Badge variant="secondary" className="ml-1 text-xs">
                {conceptCheckCount}
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

        {hasConceptCheck && (
          <TabsContent value="concept_check" className="mt-6">
            <ConceptCheckPractice 
              chapterId={chapterId!} 
              moduleId={moduleId} 
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
