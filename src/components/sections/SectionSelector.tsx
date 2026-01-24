import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useChapterSections, useTopicSections, useChapterSectionsEnabled, useTopicSectionsEnabled } from '@/hooks/useSections';

interface SectionSelectorProps {
  chapterId?: string;
  topicId?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function SectionSelector({
  chapterId,
  topicId,
  value,
  onChange,
  className,
}: SectionSelectorProps) {
  const isChapterScope = !!chapterId;
  
  // Check if sections are enabled
  const { data: chapterEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: topicEnabled } = useTopicSectionsEnabled(topicId);
  const sectionsEnabled = isChapterScope ? chapterEnabled : topicEnabled;
  
  // Fetch sections
  const { data: chapterSections } = useChapterSections(chapterId);
  const { data: topicSections } = useTopicSections(topicId);
  const sections = isChapterScope ? chapterSections : topicSections;
  
  // Don't render if sections are not enabled or no sections exist
  if (!sectionsEnabled || !sections || sections.length === 0) {
    return null;
  }
  
  return (
    <div className={className}>
      <Label htmlFor="section-select" className="text-sm font-medium">
        Section
      </Label>
      <Select
        value={value || 'unassigned'}
        onValueChange={(v) => onChange(v === 'unassigned' ? null : v)}
      >
        <SelectTrigger id="section-select" className="mt-1.5">
          <SelectValue placeholder="Select section" />
        </SelectTrigger>
        <SelectContent className="z-[99999]">
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {section.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
