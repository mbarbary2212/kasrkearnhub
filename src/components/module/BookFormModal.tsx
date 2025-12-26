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
import { useAddBook, useRenameBook } from '@/hooks/useModuleBooks';

interface BookFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  editingBook?: string | null;
}

export function BookFormModal({
  open,
  onOpenChange,
  moduleId,
  editingBook,
}: BookFormModalProps) {
  const [bookLabel, setBookLabel] = useState('');
  const addBook = useAddBook();
  const renameBook = useRenameBook();

  const isEditing = !!editingBook;

  useEffect(() => {
    if (open) {
      setBookLabel(editingBook || '');
    }
  }, [open, editingBook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookLabel.trim()) {
      toast.error('Please enter a book/department name');
      return;
    }

    try {
      if (isEditing) {
        await renameBook.mutateAsync({
          moduleId,
          oldLabel: editingBook!,
          newLabel: bookLabel.trim(),
        });
        toast.success('Book renamed successfully');
      } else {
        await addBook.mutateAsync({
          moduleId,
          bookLabel: bookLabel.trim(),
        });
        toast.success('Book added successfully');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to rename book' : 'Failed to add book');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Rename Book/Department' : 'Add Book/Department'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bookLabel">Name</Label>
              <Input
                id="bookLabel"
                value={bookLabel}
                onChange={(e) => setBookLabel(e.target.value)}
                placeholder="e.g., Book 1, Anatomy, Physiology"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addBook.isPending || renameBook.isPending}
            >
              {isEditing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
