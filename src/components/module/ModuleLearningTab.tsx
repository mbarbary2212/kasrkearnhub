import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SortDropdown } from '@/components/ui/sort-dropdown';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BookOpen, 
  ChevronRight, 
  ArrowLeft,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useChapterSort } from '@/hooks/useChapterSort';
import { ModuleChapter } from '@/hooks/useChapters';
import { useDeleteBook } from '@/hooks/useModuleBooks';
import { useDeleteChapter } from '@/hooks/useChapterManagement';
import { BookFormModal } from './BookFormModal';
import { ChapterFormModal } from './ChapterFormModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ModuleLearningTabProps {
  moduleId: string;
  chapters: ModuleChapter[] | undefined;
  chaptersLoading: boolean;
  selectorLabel?: string;
  canManageBooks?: boolean;
  canManageChapters?: boolean;
}

export function ModuleLearningTab({ 
  moduleId, 
  chapters, 
  chaptersLoading,
  selectorLabel = 'Department',
  canManageBooks = false,
  canManageChapters = false,
}: ModuleLearningTabProps) {
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  
  // Modal states
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ModuleChapter | null>(null);
  
  // Delete confirmation states
  const [deleteBookDialog, setDeleteBookDialog] = useState<string | null>(null);
  const [deleteChapterDialog, setDeleteChapterDialog] = useState<ModuleChapter | null>(null);
  
  const deleteBook = useDeleteBook();
  const deleteChapter = useDeleteChapter();
  
  const { sortMode, setSortMode, sortedItems: sortedChapters } = useChapterSort(
    chapters,
    `kasrlearn_sort_${moduleId}`,
    'default'
  );

  const hasChapters = chapters && chapters.length > 0;

  // Group chapters by book_label
  const groupedChapters = hasChapters ? sortedChapters.reduce((acc, chapter) => {
    const label = chapter.book_label || 'General';
    if (!acc[label]) acc[label] = [];
    acc[label].push(chapter);
    return acc;
  }, {} as Record<string, typeof sortedChapters>) : {};

  const bookLabels = Object.keys(groupedChapters);
  const hasMultipleBooks = bookLabels.length > 1;

  const handleAddBook = () => {
    setEditingBook(null);
    setBookModalOpen(true);
  };

  const handleEditBook = (bookLabel: string) => {
    setEditingBook(bookLabel);
    setBookModalOpen(true);
  };

  const handleDeleteBook = async (bookLabel: string) => {
    try {
      await deleteBook.mutateAsync({ moduleId, bookLabel });
      toast.success('Book deleted successfully');
      setDeleteBookDialog(null);
    } catch {
      toast.error('Failed to delete book');
    }
  };

  const handleAddChapter = (bookLabel: string) => {
    setSelectedBook(bookLabel);
    setEditingChapter(null);
    setChapterModalOpen(true);
  };

  const handleEditChapter = (chapter: ModuleChapter) => {
    setEditingChapter(chapter);
    setChapterModalOpen(true);
  };

  const handleDeleteChapter = async (chapter: ModuleChapter) => {
    try {
      await deleteChapter.mutateAsync({ chapterId: chapter.id, moduleId });
      toast.success('Chapter deleted successfully');
      setDeleteChapterDialog(null);
    } catch {
      toast.error('Failed to delete chapter');
    }
  };

  const renderChapterList = (chaptersToRender: ModuleChapter[], bookLabel?: string) => (
    <div className="space-y-2">
      {canManageChapters && bookLabel && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddChapter(bookLabel)}
          className="mb-2"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Chapter
        </Button>
      )}
      <div className="border rounded-lg divide-y">
        {chaptersToRender.map((chapter) => (
          <div
            key={chapter.id}
            className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors group"
          >
            <button
              onClick={() => navigate(`/module/${moduleId}/chapter/${chapter.id}`)}
              className="flex-1 flex items-center gap-3 text-left"
            >
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[3rem] text-center">
                Ch {chapter.chapter_number}
              </span>
              <span className="flex-1 text-[15px] font-medium truncate">
                {chapter.title}
              </span>
            </button>
            
            {canManageChapters ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditChapter(chapter)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => setDeleteChapterDialog(chapter)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
        {chaptersToRender.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No chapters yet. {canManageChapters && 'Click "Add Chapter" to create one.'}
          </div>
        )}
      </div>
    </div>
  );

  if (chaptersLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  // Empty state when no chapters and no books
  if (!hasChapters && !canManageBooks) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No chapters available yet.</p>
      </div>
    );
  }

  // If a book is selected, show that book's chapters
  if (selectedBook) {
    const bookChapters = groupedChapters[selectedBook] || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedBook(null)}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h2 className="text-lg font-semibold flex-1">{selectedBook}</h2>
        </div>
        
        <div className="flex justify-end">
          <SortDropdown sortMode={sortMode} onSortChange={setSortMode} />
        </div>
        
        {renderChapterList(bookChapters, selectedBook)}

        {/* Modals */}
        <ChapterFormModal
          open={chapterModalOpen}
          onOpenChange={setChapterModalOpen}
          moduleId={moduleId}
          bookLabel={selectedBook}
          editingChapter={editingChapter}
          existingChapters={chapters}
        />

        {/* Delete Chapter Confirmation */}
        <AlertDialog open={!!deleteChapterDialog} onOpenChange={() => setDeleteChapterDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteChapterDialog?.title}"? 
                This will also delete all content (lectures, flashcards, documents, etc.) associated with this chapter.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteChapterDialog && handleDeleteChapter(deleteChapterDialog)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show book selector view (or add first book for admins)
  if (hasMultipleBooks || canManageBooks) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            {hasMultipleBooks ? `Select ${selectorLabel}` : `${selectorLabel}s`}
          </h2>
          {canManageBooks && (
            <Button size="sm" variant="outline" onClick={handleAddBook}>
              <Plus className="w-4 h-4 mr-1" />
              Add {selectorLabel}
            </Button>
          )}
        </div>

        {bookLabels.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {bookLabels.map((bookLabel) => {
              const chapterCount = groupedChapters[bookLabel].length;
              return (
                <Card 
                  key={bookLabel}
                  className="cursor-pointer hover:shadow-md transition-shadow group relative"
                >
                  <CardContent 
                    className="flex items-center gap-4 p-4"
                    onClick={() => setSelectedBook(bookLabel)}
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{bookLabel}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
                      </p>
                    </div>
                    
                    {canManageBooks ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditBook(bookLabel); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteBookDialog(bookLabel); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No {selectorLabel.toLowerCase()}s yet.</p>
            {canManageBooks && (
              <Button onClick={handleAddBook}>
                <Plus className="w-4 h-4 mr-1" />
                Add First {selectorLabel}
              </Button>
            )}
          </div>
        )}

        {/* Modals */}
        <BookFormModal
          open={bookModalOpen}
          onOpenChange={setBookModalOpen}
          moduleId={moduleId}
          editingBook={editingBook}
        />

        {/* Delete Book Confirmation */}
        <AlertDialog open={!!deleteBookDialog} onOpenChange={() => setDeleteBookDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectorLabel}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteBookDialog}"? 
                This will also delete ALL chapters and their content within this {selectorLabel.toLowerCase()}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteBookDialog && handleDeleteBook(deleteBookDialog)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Single book or no book grouping - show chapters directly
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          Chapters
        </h2>
        <SortDropdown sortMode={sortMode} onSortChange={setSortMode} />
      </div>
      {renderChapterList(sortedChapters, bookLabels[0] || 'General')}

      {/* Modals */}
      <ChapterFormModal
        open={chapterModalOpen}
        onOpenChange={setChapterModalOpen}
        moduleId={moduleId}
        bookLabel={bookLabels[0] || 'General'}
        editingChapter={editingChapter}
        existingChapters={chapters}
      />

      {/* Delete Chapter Confirmation */}
      <AlertDialog open={!!deleteChapterDialog} onOpenChange={() => setDeleteChapterDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteChapterDialog?.title}"? 
              This will also delete all content associated with this chapter.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteChapterDialog && handleDeleteChapter(deleteChapterDialog)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
