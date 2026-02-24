import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useModuleChapters } from '@/hooks/useChapters';
import { toast } from 'sonner';
import { useBulkMoveToChapter, type ContentTableName } from '@/hooks/useContentBulkOperations';

interface MoveToChapterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  currentChapterId?: string;
  contentTable: ContentTableName;
  itemIds: string[];
  itemCount?: number;
  onComplete?: () => void;
}

export function MoveToChapterModal({
  open,
  onOpenChange,
  moduleId,
  currentChapterId,
  contentTable,
  itemIds,
  itemCount,
  onComplete,
}: MoveToChapterModalProps) {
  const { data: chapters = [] } = useModuleChapters(moduleId);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const bulkMove = useBulkMoveToChapter(contentTable);

  const count = itemCount ?? itemIds.length;
  const otherChapters = chapters.filter(c => c.id !== currentChapterId);

  const handleMove = async () => {
    if (!selectedChapterId) return;

    try {
      await bulkMove.mutateAsync({
        ids: itemIds,
        targetChapterId: selectedChapterId,
        sourceChapterId: currentChapterId,
      });
      const targetChapter = chapters.find(c => c.id === selectedChapterId);
      toast.success(`Moved ${count} item${count > 1 ? 's' : ''} to ${targetChapter?.title || 'chapter'}`);
      onOpenChange(false);
      setSelectedChapterId(null);
      onComplete?.();
    } catch (error) {
      toast.error('Failed to move items');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Move to Chapter
          </DialogTitle>
          <DialogDescription>
            Select the target chapter to move {count} item{count > 1 ? 's' : ''} to.
          </DialogDescription>
        </DialogHeader>

        {otherChapters.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No other chapters available in this module.
          </p>
        ) : (
          <ScrollArea className="max-h-[300px] pr-2">
            <div className="space-y-1">
              {otherChapters.map(chapter => (
                <button
                  key={chapter.id}
                  onClick={() => setSelectedChapterId(chapter.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedChapterId === chapter.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{chapter.title}</span>
                    {chapter.book_label && (
                      <span className="text-xs text-muted-foreground">{chapter.book_label}</span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    Ch. {chapter.chapter_number}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedChapterId || bulkMove.isPending}
          >
            {bulkMove.isPending ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
