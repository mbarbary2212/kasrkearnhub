import { useState, useRef, useEffect, useCallback } from 'react';
import { Layers, Plus, Upload, Printer, Pencil, Trash2, AlertTriangle, Settings, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface FlashcardItemProps {
  flashcard: Flashcard;
  canManage: boolean;
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (flashcard: Flashcard) => void;
  autoReturnEnabled: boolean;
  autoReturnDelay: number;
}

// Single flashcard component with 3D flip and auto-return
function FlashcardItem({
  flashcard,
  canManage,
  onEdit,
  onDelete,
  autoReturnEnabled,
  autoReturnDelay,
}: FlashcardItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track scrolling
  useEffect(() => {
    const handleScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Auto-return countdown
  useEffect(() => {
    if (isFlipped && autoReturnEnabled && !isScrollingRef.current) {
      setCountdown(autoReturnDelay);
      
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (!isScrollingRef.current) {
              setIsFlipped(false);
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isFlipped, autoReturnEnabled, autoReturnDelay]);

  const handleClick = useCallback(() => {
    // If clicking while flipped, cancel countdown and keep it open
    if (isFlipped) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      setCountdown(null);
      setIsFlipped(false);
    } else {
      setIsFlipped(true);
    }
  }, [isFlipped]);

  return (
    <div
      className="relative w-full max-w-[520px] mx-auto h-36 sm:h-40 cursor-pointer group"
      style={{ perspective: '1000px' }}
      onClick={handleClick}
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
          className="absolute inset-0 p-4 flex flex-col justify-center items-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Question</p>
          <p className="text-sm sm:text-base font-medium leading-snug line-clamp-4">{flashcard.front}</p>
          <p className="text-[10px] text-muted-foreground mt-2">Click to reveal answer</p>
        </Card>

        {/* Back */}
        <Card
          className="absolute inset-0 p-4 flex flex-col justify-center items-center text-center bg-primary/5"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Answer</p>
          <p className="text-sm sm:text-base leading-snug line-clamp-4">{flashcard.back}</p>
          
          {/* Countdown indicator */}
          {countdown !== null && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />
                Returning in {countdown}s
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Admin actions */}
      {canManage && (
        <div
          className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => onEdit(flashcard)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-7 w-7"
            onClick={() => onDelete(flashcard)}
          >
            <Trash2 className="h-3 w-3" />
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

  // Auto-return settings
  const [autoReturnEnabled, setAutoReturnEnabled] = useState(true);
  const [autoReturnDelay, setAutoReturnDelay] = useState(5);

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

      {/* Auto-return controls */}
      {flashcards && flashcards.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-return"
              checked={autoReturnEnabled}
              onCheckedChange={setAutoReturnEnabled}
            />
            <Label htmlFor="auto-return" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              Auto-return
            </Label>
          </div>
          {autoReturnEnabled && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Delay:</Label>
              <Select
                value={String(autoReturnDelay)}
                onValueChange={(val) => setAutoReturnDelay(Number(val))}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3s</SelectItem>
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="8">8s</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Flashcards grid */}
      {flashcards && flashcards.length > 0 ? (
        <div ref={printRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {flashcards.map((flashcard) => (
            <FlashcardItem
              key={flashcard.id}
              flashcard={flashcard}
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
              autoReturnEnabled={autoReturnEnabled}
              autoReturnDelay={autoReturnDelay}
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
