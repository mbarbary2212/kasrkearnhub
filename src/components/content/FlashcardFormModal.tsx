import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateFlashcard, useUpdateFlashcard, Flashcard } from '@/hooks/useFlashcards';

interface FlashcardFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  moduleId: string;
  flashcard?: Flashcard | null;
}

export default function FlashcardFormModal({
  open,
  onOpenChange,
  chapterId,
  moduleId,
  flashcard,
}: FlashcardFormModalProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const createMutation = useCreateFlashcard();
  const updateMutation = useUpdateFlashcard();

  const isEditing = !!flashcard;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (flashcard) {
      setFront(flashcard.front);
      setBack(flashcard.back);
    } else {
      setFront('');
      setBack('');
    }
  }, [flashcard, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!front.trim() || !back.trim()) return;

    if (isEditing && flashcard) {
      await updateMutation.mutateAsync({
        id: flashcard.id,
        front: front.trim(),
        back: back.trim(),
        chapterId,
      });
    } else {
      await createMutation.mutateAsync({
        chapter_id: chapterId,
        module_id: moduleId,
        front: front.trim(),
        back: back.trim(),
      });
    }

    onOpenChange(false);
    setFront('');
    setBack('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Flashcard' : 'Add Flashcard'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="front">Front (Question / Prompt)</Label>
            <Textarea
              id="front"
              placeholder="Enter the question or prompt..."
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="back">Back (Answer)</Label>
            <Textarea
              id="back"
              placeholder="Enter the answer..."
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !front.trim() || !back.trim()}>
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Flashcard'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
