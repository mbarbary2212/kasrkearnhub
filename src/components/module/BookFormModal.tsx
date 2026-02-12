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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAddBook, useUpdateBook, ModuleBook } from '@/hooks/useModuleBooks';

interface BookFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  editingBook?: ModuleBook | null;
}

const CHAPTER_PREFIXES = [
  { value: 'Ch', label: 'Chapter (Ch)' },
  { value: 'Ch', label: 'Chapter (Ch)' },
];

export function BookFormModal({
  open,
  onOpenChange,
  moduleId,
  editingBook,
}: BookFormModalProps) {
  const [bookLabel, setBookLabel] = useState('');
  const [chapterPrefix, setChapterPrefix] = useState('Ch');
  const addBook = useAddBook();
  const updateBook = useUpdateBook();

  const isEditing = !!editingBook;

  useEffect(() => {
    if (open) {
      if (editingBook) {
        setBookLabel(editingBook.book_label);
        setChapterPrefix(editingBook.chapter_prefix || 'Ch');
      } else {
        setBookLabel('');
        setChapterPrefix('Ch');
      }
    }
  }, [open, editingBook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookLabel.trim()) {
      toast.error('Please enter a department/book name');
      return;
    }

    try {
      if (isEditing) {
        await updateBook.mutateAsync({
          moduleId,
          oldLabel: editingBook.book_label,
          newLabel: bookLabel.trim() !== editingBook.book_label ? bookLabel.trim() : undefined,
          chapterPrefix: chapterPrefix !== editingBook.chapter_prefix ? chapterPrefix : undefined,
        });
        toast.success('Department updated successfully');
      } else {
        await addBook.mutateAsync({
          moduleId,
          bookLabel: bookLabel.trim(),
          chapterPrefix,
        });
        toast.success('Department added successfully');
      }
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Unknown error';

      if (
        errorMessage.includes('duplicate key') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('module_books_module_id_book_label_key')
      ) {
        toast.error(`A department named "${bookLabel.trim()}" already exists in this module`);
      } else {
        toast.error(
          `${isEditing ? 'Failed to update department' : 'Failed to add department'}: ${errorMessage}`
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Department' : 'Add Department'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bookLabel">Department Name</Label>
              <Input
                id="bookLabel"
                value={bookLabel}
                onChange={(e) => setBookLabel(e.target.value)}
                placeholder="e.g., Pharmacology, Pathology"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="chapterPrefix">Chapter Label Style</Label>
              <Select value={chapterPrefix} onValueChange={setChapterPrefix}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {CHAPTER_PREFIXES.map((prefix) => (
                    <SelectItem key={prefix.value} value={prefix.value}>
                      {prefix.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Chapters will be labeled as "{chapterPrefix} 1", "{chapterPrefix} 2", etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addBook.isPending || updateBook.isPending}
            >
              {isEditing ? 'Save' : 'Add Department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
