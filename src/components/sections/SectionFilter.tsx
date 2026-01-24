import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Layers, ChevronDown } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  
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
  
  const handleSelect = (sectionId: string | null) => {
    onSectionChange(sectionId);
    setShowMobileSheet(false);
  };
  
  // Chip component
  const FilterChip = ({ 
    section, 
    isActive, 
    onClick 
  }: { 
    section: Section | null; 
    isActive: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors",
        "min-h-[36px] sm:min-h-[32px] flex items-center",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
      )}
    >
      {section ? section.name : 'All'}
    </button>
  );
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Label - hidden on very small screens */}
      <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
        <Layers className="h-4 w-4" />
        <span>Sections:</span>
      </div>
      
      {/* Desktop: Horizontal scroll chips */}
      <div className="hidden sm:block flex-1 overflow-hidden">
        <div 
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <FilterChip 
            section={null} 
            isActive={!selectedSectionId} 
            onClick={() => handleSelect(null)} 
          />
          {sections.map(section => (
            <FilterChip
              key={section.id}
              section={section}
              isActive={selectedSectionId === section.id}
              onClick={() => handleSelect(section.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Mobile: Compact button with sheet */}
      <div className="sm:hidden flex-1">
        <Sheet open={showMobileSheet} onOpenChange={setShowMobileSheet}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-9"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span className="truncate">
                  {selectedSection ? selectedSection.name : 'All Sections'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 ml-1 shrink-0" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[60vh]">
            <SheetHeader className="pb-4">
              <SheetTitle>Select Section</SheetTitle>
            </SheetHeader>
            <div className="space-y-2 pb-4">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full p-3 rounded-lg text-left text-sm font-medium transition-colors",
                  !selectedSectionId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                All Sections
              </button>
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => handleSelect(section.id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left text-sm font-medium transition-colors",
                    selectedSectionId === section.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
