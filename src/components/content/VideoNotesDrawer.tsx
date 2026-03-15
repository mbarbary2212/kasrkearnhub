import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useVideoNotes } from '@/hooks/useVideoNotes';
import { toast } from 'sonner';

interface VideoNotesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoNotesDrawer({ open, onOpenChange, videoId, videoTitle }: VideoNotesDrawerProps) {
  const { notes, addNote, deleteNote } = useVideoNotes(videoId);
  const [noteText, setNoteText] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }
    try {
      await addNote.mutateAsync({
        videoId,
        timestampSeconds: parseInt(timestamp) || 0,
        noteText: noteText.trim(),
      });
      setNoteText('');
      setTimestamp('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left truncate">Notes — {videoTitle}</SheetTitle>
        </SheetHeader>

        {/* Add note */}
        <div className="space-y-2 pt-4 border-b pb-4">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note..."
            rows={3}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="At second (optional)"
              className="w-40"
              min={0}
            />
            <Button onClick={handleAdd} disabled={addNote.isPending} size="sm">
              {addNote.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-3 pt-4">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-xs font-mono text-primary shrink-0 pt-0.5">
                  {formatTimestamp(note.timestamp_seconds)}
                </span>
                <p className="text-sm flex-1 break-words">{note.note_text}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(note.id)}
                  disabled={deleteNote.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
