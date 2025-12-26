import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCreateChapter, useUpdateChapter } from '@/hooks/useChapterManagement';
import { ModuleChapter } from '@/hooks/useChapters';

interface ChapterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  bookLabel: string;
  editingChapter?: ModuleChapter | null;
  existingChapters?: ModuleChapter[];
}

export function ChapterFormModal({
  open,
  onOpenChange,
  moduleId,
  bookLabel,
  editingChapter,
  existingChapters = [],
}: ChapterFormModalProps) {
  const [title, setTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();

  const isEditing = !!editingChapter;

  useEffect(() => {
    if (open) {
      if (editingChapter) {
        setTitle(editingChapter.title);
        setChapterNumber(editingChapter.chapter_number);
      } else {
        setTitle('');
        // Auto-increment chapter number
        const bookChapters = existingChapters.filter(c => c.book_label === bookLabel);
        const maxNumber = bookChapters.reduce((max, c) => Math.max(max, c.chapter_number), 0);
        setChapterNumber(maxNumber + 1);
      }
    }
  }, [open, editingChapter, existingChapters, bookLabel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a chapter title');
      return;
    }

    if (chapterNumber < 1) {
      toast.error('Chapter number must be at least 1');
      return;
    }

    try {
      if (isEditing) {
        await updateChapter.mutateAsync({
          chapterId: editingChapter!.id,
          moduleId,
          title: title.trim(),
          chapterNumber,
        });
        toast.success('Chapter updated successfully');
      } else {
        await createChapter.mutateAsync({
          moduleId,
          bookLabel,
          title: title.trim(),
          chapterNumber,
        });
        toast.success('Chapter created successfully');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update chapter' : 'Failed to create chapter');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Chapter' : 'Add Chapter'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="chapterNumber">Chapter Number</Label>
              <Input
                id="chapterNumber"
                type="number"
                min={1}
                value={chapterNumber}
                onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to Anatomy"
                autoFocus
              />
            </div>
            {bookLabel && (
              <div className="text-sm text-muted-foreground">
                Book/Department: <span className="font-medium">{bookLabel}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createChapter.isPending || updateChapter.isPending}
            >
              {isEditing ? 'Save' : 'Add Chapter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
