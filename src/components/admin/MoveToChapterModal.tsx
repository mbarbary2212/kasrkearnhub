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
import { Label } from '@/components/ui/label';
import { ArrowRight, BookOpen, ChevronLeft, Copy, Library } from 'lucide-react';
import { useModuleChapters } from '@/hooks/useChapters';
import { useModules } from '@/hooks/useModules';
import { useYears } from '@/hooks/useYears';
import { toast } from 'sonner';
import { useBulkMoveToChapter, useBulkCopyToChapter, type ContentTableName } from '@/hooks/useContentBulkOperations';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ActionMode = 'move' | 'copy';

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
  const [selectedModuleId, setSelectedModuleId] = useState<string>(moduleId);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [step, setStep] = useState<'module' | 'chapter'>('chapter');
  const [mode, setMode] = useState<ActionMode>('move');

  const { data: allModules = [] } = useModules();
  const { data: years = [] } = useYears();
  const { data: chapters = [] } = useModuleChapters(selectedModuleId);
  const bulkMove = useBulkMoveToChapter(contentTable);
  const bulkCopy = useBulkCopyToChapter(contentTable);

  const count = itemCount ?? itemIds.length;
  const isSameModule = selectedModuleId === moduleId;
  const otherChapters = isSameModule
    ? chapters.filter(c => c.id !== currentChapterId)
    : chapters;

  const selectedModule = allModules.find(m => m.id === selectedModuleId);
  const isPending = bulkMove.isPending || bulkCopy.isPending;

  const handleAction = async () => {
    if (!selectedChapterId) return;

    try {
      const targetChapter = chapters.find(c => c.id === selectedChapterId);
      
      if (mode === 'move') {
        await bulkMove.mutateAsync({
          ids: itemIds,
          targetChapterId: selectedChapterId,
          targetModuleId: isSameModule ? undefined : selectedModuleId,
          sourceChapterId: currentChapterId,
        });
        toast.success(`Moved ${count} item${count > 1 ? 's' : ''} to ${targetChapter?.title || 'chapter'}`);
      } else {
        await bulkCopy.mutateAsync({
          ids: itemIds,
          targetChapterId: selectedChapterId,
          targetModuleId: selectedModuleId,
        });
        toast.success(`Copied ${count} item${count > 1 ? 's' : ''} to ${targetChapter?.title || 'chapter'}`);
      }
      
      handleClose();
      onComplete?.();
    } catch (error) {
      toast.error(`Failed to ${mode} items`);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedChapterId(null);
    setSelectedModuleId(moduleId);
    setStep('chapter');
    setMode('move');
  };

  const handleSelectModule = (id: string) => {
    setSelectedModuleId(id);
    setSelectedChapterId(null);
    setStep('chapter');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'move' ? <ArrowRight className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {mode === 'move' ? 'Move' : 'Copy'} to Chapter
          </DialogTitle>
          <DialogDescription>
            {step === 'module'
              ? 'Select a module, then pick a chapter.'
              : `Select the target chapter to ${mode} ${count} item${count > 1 ? 's' : ''} to.`}
          </DialogDescription>
        </DialogHeader>

        {/* Move / Copy toggle */}
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground shrink-0">Action:</Label>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as ActionMode)}
            className="bg-muted rounded-lg p-0.5"
          >
            <ToggleGroupItem value="move" className="h-7 px-3 text-xs gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <ArrowRight className="h-3.5 w-3.5" />
              Move
            </ToggleGroupItem>
            <ToggleGroupItem value="copy" className="h-7 px-3 text-xs gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <Copy className="h-3.5 w-3.5" />
              Copy
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {step === 'chapter' && (
          <>
            {/* Module selector strip */}
            <div className="flex items-center gap-2 text-sm">
              <Label className="text-muted-foreground shrink-0">Module:</Label>
              <Badge
                variant="secondary"
                className="truncate max-w-[200px] cursor-pointer hover:bg-secondary/80"
                onClick={() => setStep('module')}
              >
                {selectedModule?.name || 'Current module'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStep('module')}
              >
                Change
              </Button>
            </div>

            {otherChapters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No {isSameModule ? 'other ' : ''}chapters available in this module.
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
          </>
        )}

        {step === 'module' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit gap-1 -mt-1"
              onClick={() => setStep('chapter')}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to chapters
            </Button>
            <ScrollArea className="max-h-[350px] pr-2">
              <div className="space-y-1">
                {[...allModules].sort((a, b) => a.name.localeCompare(b.name)).map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => handleSelectModule(mod.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedModuleId === mod.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <Library className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{mod.name}</span>
                      {mod.slug && (
                        <span className="text-xs text-muted-foreground">{mod.slug}</span>
                      )}
                    </div>
                    {mod.id === moduleId && (
                      <Badge variant="outline" className="text-xs shrink-0">Current</Badge>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === 'chapter' && (
            <Button
              onClick={handleAction}
              disabled={!selectedChapterId || isPending}
            >
              {isPending ? (mode === 'move' ? 'Moving...' : 'Copying...') : (mode === 'move' ? 'Move' : 'Copy')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
