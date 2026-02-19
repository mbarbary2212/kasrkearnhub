import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ConceptSelect } from '@/components/content/ConceptSelect';
import { useBulkUpdateConcept, type ContentTableName } from '@/hooks/useContentBulkOperations';
import { Tag, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';

interface BulkConceptAssignmentProps {
  moduleId: string;
  chapterId?: string;
  sectionId?: string | null;
  selectedIds: string[];
  contentTable: ContentTableName;
  onComplete?: () => void;
}

export function BulkConceptAssignment({
  moduleId,
  chapterId,
  sectionId,
  selectedIds,
  contentTable,
  onComplete,
}: BulkConceptAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [conceptId, setConceptId] = useState<string | null>(null);

  const bulkUpdate = useBulkUpdateConcept(contentTable);

  const handleAssign = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select items first');
      return;
    }

    try {
      await bulkUpdate.mutateAsync({
        ids: selectedIds,
        conceptId,
      });
      toast.success(`Set concept on ${selectedIds.length} item(s)`);
      setOpen(false);
      setConceptId(null);
      onComplete?.();
    } catch (error) {
      toast.error('Failed to set concept');
      console.error('Bulk concept assign error:', error);
    }
  };

  const handleClear = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select items first');
      return;
    }

    try {
      await bulkUpdate.mutateAsync({
        ids: selectedIds,
        conceptId: null,
      });
      toast.success(`Cleared concept from ${selectedIds.length} item(s)`);
      setOpen(false);
      onComplete?.();
    } catch (error) {
      toast.error('Failed to clear concept');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={selectedIds.length === 0}
          className="gap-1.5 h-7"
        >
          <Tag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Concept</span>
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {selectedIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Bulk Set Concept</h4>
            <p className="text-xs text-muted-foreground">
              Assign a concept to {selectedIds.length} selected item(s)
            </p>
          </div>

          <ConceptSelect
            moduleId={moduleId}
            chapterId={chapterId}
            sectionId={sectionId}
            value={conceptId}
            onChange={setConceptId}
          />

          <div className="flex gap-2">
            <Button
              className="flex-1 gap-1.5"
              size="sm"
              onClick={handleAssign}
              disabled={bulkUpdate.isPending || !conceptId}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {bulkUpdate.isPending ? 'Applying...' : 'Apply'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={bulkUpdate.isPending}
              className="gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
