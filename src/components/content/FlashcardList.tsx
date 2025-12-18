import { useState, useRef } from 'react';
import { Layers, Plus, Upload, Printer, Pencil, Trash2, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useChapterFlashcards,
  useFlashcardDisclaimer,
  useDeleteFlashcard,
  useUpdateDisclaimer,
  Flashcard,
} from '@/hooks/useFlashcards';
import FlashcardFormModal from './FlashcardFormModal';
import FlashcardBulkUpload from './FlashcardBulkUpload';

interface FlashcardListProps {
  chapterId: string;
  moduleId: string;
  canManage?: boolean;
  isSuperAdmin?: boolean;
}

// Single flashcard component with 3D flip
function FlashcardItem({
  flashcard,
  canManage,
  onEdit,
  onDelete,
}: {
  flashcard: Flashcard;
  canManage: boolean;
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (flashcard: Flashcard) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative w-full h-48 cursor-pointer group"
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <Card
          className="absolute inset-0 p-6 flex flex-col justify-center items-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Question</p>
          <p className="text-lg font-medium">{flashcard.front}</p>
          <p className="text-xs text-muted-foreground mt-4">Click to reveal answer</p>
        </Card>

        {/* Back */}
        <Card
          className="absolute inset-0 p-6 flex flex-col justify-center items-center text-center bg-primary/5"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Answer</p>
          <p className="text-lg">{flashcard.back}</p>
        </Card>
      </div>

      {/* Admin actions */}
      {canManage && (
        <div
          className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => onEdit(flashcard)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            onClick={() => onDelete(flashcard)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function FlashcardList({
  chapterId,
  moduleId,
  canManage = false,
  isSuperAdmin = false,
}: FlashcardListProps) {
  const { data: flashcards, isLoading } = useChapterFlashcards(chapterId);
  const { data: disclaimer } = useFlashcardDisclaimer();
  const deleteMutation = useDeleteFlashcard();
  const updateDisclaimerMutation = useUpdateDisclaimer();

  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Flashcard | null>(null);
  const [disclaimerEditOpen, setDisclaimerEditOpen] = useState(false);
  const [editedDisclaimer, setEditedDisclaimer] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  const handleEdit = (flashcard: Flashcard) => {
    setEditingFlashcard(flashcard);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync({ id: deleteConfirm.id, chapterId });
    setDeleteConfirm(null);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !flashcards) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Flashcards</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .flashcard { 
            border: 1px solid #ddd; 
            padding: 20px; 
            margin-bottom: 20px; 
            page-break-inside: avoid;
            border-radius: 8px;
          }
          .question { font-weight: bold; margin-bottom: 10px; }
          .label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
          .answer { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ddd; }
          @media print {
            .flashcard { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Flashcards</h1>
        ${flashcards
          .map(
            (card, index) => `
          <div class="flashcard">
            <div class="label">Question ${index + 1}</div>
            <div class="question">${card.front}</div>
            <div class="answer">
              <div class="label">Answer</div>
              <div>${card.back}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const openDisclaimerEdit = () => {
    setEditedDisclaimer(disclaimer || '');
    setDisclaimerEditOpen(true);
  };

  const saveDisclaimer = async () => {
    await updateDisclaimerMutation.mutateAsync(editedDisclaimer);
    setDisclaimerEditOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      {disclaimer && (
        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <span>{disclaimer}</span>
            {isSuperAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 h-7"
                onClick={openDisclaimerEdit}
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Admin actions */}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setEditingFlashcard(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Flashcard
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          {flashcards && flashcards.length > 0 && (
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print / Export
            </Button>
          )}
        </div>
      )}

      {/* Print button for students if there are flashcards */}
      {!canManage && flashcards && flashcards.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print / Export
          </Button>
        </div>
      )}

      {/* Flashcards grid */}
      {flashcards && flashcards.length > 0 ? (
        <div ref={printRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map((flashcard) => (
            <FlashcardItem
              key={flashcard.id}
              flashcard={flashcard}
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No flashcards available yet.</p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Flashcard" or "Bulk Import" to get started.
            </p>
          )}
        </div>
      )}

      {/* Form modal */}
      <FlashcardFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingFlashcard(null);
        }}
        chapterId={chapterId}
        moduleId={moduleId}
        flashcard={editingFlashcard}
      />

      {/* Bulk upload modal */}
      <FlashcardBulkUpload
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        chapterId={chapterId}
        moduleId={moduleId}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flashcard? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disclaimer edit dialog (Super Admin only) */}
      <Dialog open={disclaimerEditOpen} onOpenChange={setDisclaimerEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Disclaimer</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedDisclaimer}
            onChange={(e) => setEditedDisclaimer(e.target.value)}
            rows={4}
            placeholder="Enter disclaimer text..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisclaimerEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveDisclaimer}
              disabled={updateDisclaimerMutation.isPending}
            >
              {updateDisclaimerMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
