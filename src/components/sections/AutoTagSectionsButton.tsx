import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';
import { useAutoTagSections } from '@/hooks/useAutoTagSections';
import { useChapterSections, useTopicSections, useChapterSectionsEnabled, useTopicSectionsEnabled } from '@/hooks/useSections';
import { toast } from 'sonner';

interface AutoTagSectionsButtonProps {
  chapterId?: string;
  topicId?: string;
  /** Optional: called after tagging completes so parent can refetch */
  onComplete?: () => void;
  className?: string;
}

export function AutoTagSectionsButton({
  chapterId,
  topicId,
  onComplete,
  className,
}: AutoTagSectionsButtonProps) {
  const { autoTag, isRunning, progress } = useAutoTagSections();

  const isChapterScope = !!chapterId;

  const { data: chapterEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: topicEnabled } = useTopicSectionsEnabled(topicId);
  const sectionsEnabled = isChapterScope ? chapterEnabled : topicEnabled;

  const { data: chapterSections } = useChapterSections(chapterId);
  const { data: topicSections } = useTopicSections(topicId);
  const sections = isChapterScope ? chapterSections : topicSections;

  // Don't render if sections are not enabled or no sections exist
  if (!sectionsEnabled || !sections || sections.length === 0) {
    return null;
  }

  const handleAutoTag = async () => {
    try {
      const results = await autoTag(sections, chapterId, topicId);
      const totalTagged = results.reduce((sum, r) => sum + r.tagged, 0);
      const totalEligible = results.reduce((sum, r) => sum + r.total, 0);
      const aiTagged = (results as any).__aiTagged || 0;

      if (totalEligible === 0) {
        toast.info('All content is already assigned to sections');
      } else if (totalTagged === 0) {
        toast.warning(`Could not match any of ${totalEligible} unassigned items. Try assigning manually.`);
      } else {
        toast.success(`AI assigned ${aiTagged} of ${totalEligible} unassigned items to sections`);
      }
      onComplete?.();
    } catch (err) {
      toast.error('Auto-tag failed');
      console.error('Auto-tag error:', err);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAutoTag}
      disabled={isRunning}
      className={className}
      title="AI auto-assign untagged content to sections"
    >
      {isRunning ? (
        <>
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          <span className="hidden sm:inline">{progress || 'Auto-tagging...'}</span>
          <span className="sm:hidden">...</span>
        </>
      ) : (
        <>
          <Wand2 className="w-3.5 h-3.5 mr-1.5" />
          <span className="hidden sm:inline">AI Assign Sections</span>
        </>
      )}
    </Button>
  );
}
