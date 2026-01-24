import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  useChapterSections, 
  useTopicSections, 
  useChapterSectionsEnabled, 
  useTopicSectionsEnabled,
  useBulkAssignSection 
} from '@/hooks/useSections';
import { FolderOpen, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

interface BulkSectionAssignmentProps {
  chapterId?: string;
  topicId?: string;
  selectedIds: string[];
  contentTable: 'lectures' | 'resources' | 'mcq_sets' | 'essays' | 'practicals' | 'clinical_cases' | 'study_resources' | 'osce_questions' | 'matching_questions';
  onComplete?: () => void;
}

export function BulkSectionAssignment({
  chapterId,
  topicId,
  selectedIds,
  contentTable,
  onComplete,
}: BulkSectionAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [targetSection, setTargetSection] = useState<string | null>(null);
  
  const isChapterScope = !!chapterId;
  
  // Check if sections are enabled
  const { data: chapterEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: topicEnabled } = useTopicSectionsEnabled(topicId);
  const sectionsEnabled = isChapterScope ? chapterEnabled : topicEnabled;
  
  // Fetch sections
  const { data: chapterSections } = useChapterSections(chapterId);
  const { data: topicSections } = useTopicSections(topicId);
  const sections = isChapterScope ? chapterSections : topicSections;
  
  const bulkAssign = useBulkAssignSection();
  
  // Don't render if sections are not enabled or no sections exist
  if (!sectionsEnabled || !sections || sections.length === 0) {
    return null;
  }
  
  const handleAssign = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select items first');
      return;
    }
    
    try {
      await bulkAssign.mutateAsync({
        table: contentTable,
        itemIds: selectedIds,
        sectionId: targetSection,
      });
      toast.success(`Assigned ${selectedIds.length} item(s) to section`);
      setOpen(false);
      setTargetSection(null);
      onComplete?.();
    } catch (error) {
      toast.error('Failed to assign sections');
      console.error('Bulk assign error:', error);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={selectedIds.length === 0}
          className="gap-1.5"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Assign Section</span>
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {selectedIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Bulk Assign Section</h4>
            <p className="text-xs text-muted-foreground">
              Assign {selectedIds.length} selected item(s) to a section
            </p>
          </div>
          
          <Select
            value={targetSection || 'unassigned'}
            onValueChange={(v) => setTargetSection(v === 'unassigned' ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned (remove from section)</SelectItem>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            className="w-full gap-1.5" 
            size="sm"
            onClick={handleAssign}
            disabled={bulkAssign.isPending}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {bulkAssign.isPending ? 'Assigning...' : 'Apply'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}