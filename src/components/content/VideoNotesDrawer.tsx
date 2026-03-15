import { useEffect, useMemo, useState } from 'react';
import { Download, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  currentTimestampSeconds?: number;
  isTimestampLive?: boolean;
}

function formatTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'video-notes';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function VideoNotesDrawer({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  currentTimestampSeconds,
  isTimestampLive = false,
}: VideoNotesDrawerProps) {
  const { notes, addNote, deleteNote } = useVideoNotes(videoId);
  const [noteText, setNoteText] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [useLiveTimestamp, setUseLiveTimestamp] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUseLiveTimestamp(isTimestampLive);

    if (isTimestampLive && typeof currentTimestampSeconds === 'number') {
      setTimestamp(String(Math.max(0, Math.floor(currentTimestampSeconds))));
    }
  }, [open, isTimestampLive, currentTimestampSeconds]);

  useEffect(() => {
    if (!useLiveTimestamp || typeof currentTimestampSeconds !== 'number') return;
    setTimestamp(String(Math.max(0, Math.floor(currentTimestampSeconds))));
  }, [useLiveTimestamp, currentTimestampSeconds]);

  const effectiveTimestampSeconds = useMemo(() => {
    if (useLiveTimestamp && typeof currentTimestampSeconds === 'number') {
      return Math.max(0, Math.floor(currentTimestampSeconds));
    }

    const parsed = Number.parseInt(timestamp, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [timestamp, useLiveTimestamp, currentTimestampSeconds]);

  const notesExportContent = useMemo(() => {
    const lines = notes.map((note) => `[${formatTimestamp(note.timestamp_seconds)}] ${note.note_text}`);
    return [`Video: ${videoTitle}`, `Exported: ${new Date().toLocaleString()}`, '', ...lines].join('\n');
  }, [notes, videoTitle]);

  const handleAdd = async () => {
    if (!noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await addNote.mutateAsync({
        videoId,
        timestampSeconds: effectiveTimestampSeconds,
        noteText: noteText.trim(),
      });

      setNoteText('');
      if (!useLiveTimestamp) setTimestamp('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      setNoteToDelete(null);
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const handleExport = () => {
    if (notes.length === 0) {
      toast.error('No notes to export');
      return;
    }

    const blob = new Blob([notesExportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(videoTitle)}-notes.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (notes.length === 0) {
      toast.error('No notes to print');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Please allow popups to print notes');
      return;
    }

    const notesHtml = notes
      .map(
        (note) =>
          `<li style="margin-bottom: 8px;"><strong>[${formatTimestamp(note.timestamp_seconds)}]</strong> ${escapeHtml(note.note_text)}</li>`
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(videoTitle)} - Notes</title>
        </head>
        <body style="font-family: sans-serif; padding: 24px;">
          <h1 style="margin: 0 0 8px 0;">${escapeHtml(videoTitle)} - Notes</h1>
          <p style="margin: 0 0 20px 0; color: #555;">Generated on ${new Date().toLocaleString()}</p>
          <ol style="padding-left: 20px;">${notesHtml}</ol>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="space-y-2">
            <SheetTitle className="text-left truncate">Notes — {videoTitle}</SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            </div>
          </SheetHeader>

          {/* Add note */}
          <div className="space-y-2 pt-4 border-b pb-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note..."
              rows={3}
            />

            {isTimestampLive && (
              <div className="flex items-center gap-2 py-1">
                <Checkbox
                  id="video-live-timestamp"
                  checked={useLiveTimestamp}
                  onCheckedChange={(checked) => setUseLiveTimestamp(checked === true)}
                />
                <label htmlFor="video-live-timestamp" className="text-xs text-muted-foreground cursor-pointer">
                  Auto timestamp from playing video ({formatTimestamp(Math.max(0, Math.floor(currentTimestampSeconds ?? 0)))})
                </label>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="At second"
                className="w-40"
                min={0}
                disabled={useLiveTimestamp}
              />
              <span className="text-xs text-muted-foreground">{formatTimestamp(effectiveTimestampSeconds)}</span>
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
                    onClick={() => setNoteToDelete(note.id)}
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

      <AlertDialog open={!!noteToDelete} onOpenChange={(nextOpen) => !nextOpen && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => noteToDelete && handleDelete(noteToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
