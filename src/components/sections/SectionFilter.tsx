import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { useChapterSections, useTopicSections, useChapterSectionsEnabled, useTopicSectionsEnabled, Section } from '@/hooks/useSections';

interface SectionFilterProps {
  chapterId?: string;
  topicId?: string;
  selectedSectionId: string | null;
  onSectionChange: (sectionId: string | null) => void;
  className?: string;
}

export function SectionFilter({
  chapterId,
  topicId,
  selectedSectionId,
  onSectionChange,
  className,
}: SectionFilterProps) {
  const isChapterScope = !!chapterId;
  
  // Check if sections are enabled
  const { data: chapterEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: topicEnabled } = useTopicSectionsEnabled(topicId);
  const sectionsEnabled = isChapterScope ? chapterEnabled : topicEnabled;
  
  // Fetch sections
  const { data: chapterSections } = useChapterSections(chapterId);
  const { data: topicSections } = useTopicSections(topicId);
  const sections = isChapterScope ? chapterSections : topicSections;
  
  // Find the selected section for display
  const selectedSection = sections?.find(s => s.id === selectedSectionId);
  
  // Don't render if sections are not enabled or no sections exist
  if (!sectionsEnabled || !sections || sections.length === 0) {
    return null;
  }
  
  const sectionCount = sections.length;
  
  return (
    <div className={cn("flex justify-center py-3", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10",
              "border-2 border-primary/30 shadow-sm",
              "text-sm font-medium transition-all duration-200",
              "hover:border-primary/50 hover:shadow-md hover:scale-[1.02]",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
            )}
          >
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-foreground">
              {selectedSection ? selectedSection.name : 'All Sections'}
            </span>
            <Badge 
              variant="secondary" 
              className="h-5 px-1.5 text-[10px] bg-primary/20 text-primary border-0"
            >
              {sectionCount}
            </Badge>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-64 max-h-80 overflow-y-auto bg-popover border border-border shadow-lg z-50"
          align="center"
          sideOffset={8}
        >
          <DropdownMenuItem
            onClick={() => onSectionChange(null)}
            className={cn(
              "flex items-center justify-between gap-2 py-3 cursor-pointer",
              !selectedSectionId && "bg-primary/10"
            )}
          >
            <div className="flex items-center gap-2">
              <Layers className={cn("w-4 h-4", !selectedSectionId ? "text-primary" : "text-muted-foreground")} />
              <span className={cn(!selectedSectionId && "font-medium text-primary")}>All Sections</span>
            </div>
            {!selectedSectionId && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
          
          {sections.map((section) => {
            const isActive = selectedSectionId === section.id;
            return (
              <DropdownMenuItem
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "flex items-center justify-between gap-2 py-3 cursor-pointer",
                  isActive && "bg-primary/10"
                )}
              >
                <span className={cn(
                  "truncate",
                  isActive && "font-medium text-primary"
                )}>
                  {section.name}
                </span>
                {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
