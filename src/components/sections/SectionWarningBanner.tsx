import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChapterSections, useTopicSections } from '@/hooks/useSections';

interface SectionWarningBannerProps {
  chapterId?: string | null;
  topicId?: string | null;
}

export function SectionWarningBanner({ chapterId, topicId }: SectionWarningBannerProps) {
  const { data: chapterSections = [], isLoading: loadingChapter } = useChapterSections(chapterId ?? undefined);
  const { data: topicSections = [], isLoading: loadingTopic } = useTopicSections(topicId ?? undefined);

  const sections = chapterId ? chapterSections : topicSections;
  const isLoading = chapterId ? loadingChapter : loadingTopic;

  // Don't show if loading or if sections exist
  if (isLoading || sections.length > 0) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        <strong>No sections created yet.</strong> Section info from your file will be preserved so you can auto-tag content after creating sections. 
        We recommend creating sections first for automatic assignment.
      </AlertDescription>
    </Alert>
  );
}
