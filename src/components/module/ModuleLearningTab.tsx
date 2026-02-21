import { useState, useMemo } from 'react';
import { type SortMode } from '@/hooks/useChapterSort';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { LectureListSkeleton } from '@/components/ui/skeletons';
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
  GripVertical,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useChapterSort } from '@/hooks/useChapterSort';
import { ModuleChapter } from '@/hooks/useChapters';
import { useModuleBooks, useDeleteBook, useReorderBooks, ModuleBook } from '@/hooks/useModuleBooks';
import { useDeleteChapter } from '@/hooks/useChapterManagement';
import { useTopics } from '@/hooks/useTopics';
import { BookFormModal } from './BookFormModal';
import { ChapterFormModal } from './ChapterFormModal';
import { PharmacologyTopicsView } from './PharmacologyTopicsView';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Pharmacology department ID - for Topics view
const PHARMACOLOGY_DEPT_ID = '71af9f4d-578c-45d9-bec7-9598e54728e6';

interface ModuleLearningTabProps {
  moduleId: string;
  chapters: ModuleChapter[] | undefined;
  chaptersLoading: boolean;
  selectorLabel?: string;
  canManageBooks?: boolean;
  canManageChapters?: boolean;
  selectedDepartmentId?: string | null;
}

// Sortable book card component
function SortableBookCard({ 
  book, 
  lectureCount,
  topicCount,
  isPharmacology,
  canManageBooks,
  onSelect,
  onEdit,
  onDelete,
}: { 
  book: ModuleBook;
  lectureCount: number;
  topicCount?: number;
  isPharmacology?: boolean;
  canManageBooks: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.book_label });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow group relative",
        isDragging && "z-50"
      )}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {canManageBooks && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div 
          className="flex-1 flex items-center gap-4 min-w-0"
          onClick={onSelect}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{book.book_label}</h3>
            <p className="text-sm text-muted-foreground">
              {isPharmacology 
                ? `${topicCount || 0} ${(topicCount || 0) === 1 ? 'Topic' : 'Topics'}`
                : `${lectureCount} ${lectureCount === 1 ? 'Chapter' : 'Chapters'}`
              }
            </p>
          </div>
        </div>
        
        {canManageBooks ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
}

// Component to show lectures (chapters) for a book/department
function BookLecturesView({
  moduleId,
  bookLabel,
  canManage,
  onBack,
}: {
  moduleId: string;
  bookLabel: string;
  canManage: boolean;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ModuleChapter | null>(null);
  const [deleteChapterDialog, setDeleteChapterDialog] = useState<ModuleChapter | null>(null);
  
  const deleteChapter = useDeleteChapter();
  
  // Module IDs for SUR-423 and SUR-523 that show sort filter for Book 2 and Book 3
  const SURGERY_MODULE_IDS = [
    '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', // SUR-423
    '7f5167dd-b746-4ac6-94f3-109d637df861', // SUR-523
  ];
  const SORTABLE_BOOKS = ['Book 2', 'Book 3'];
  const showSortFilter = SURGERY_MODULE_IDS.includes(moduleId) && SORTABLE_BOOKS.includes(bookLabel);
  
  const [sortMode, setSortMode] = useState<SortMode>('default');
  
  // Fetch chapters for this book (these are the "lectures")
  const { data: chaptersRaw, isLoading: chaptersLoading } = useQuery({
    queryKey: ['module-chapters-for-book', moduleId, bookLabel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .eq('module_id', moduleId)
        .eq('book_label', bookLabel)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as ModuleChapter[];
    },
  });
  
  // Apply sorting based on user selection
  const chapters = useMemo(() => {
    if (!chaptersRaw) return undefined;
    if (sortMode === 'default') return chaptersRaw;
    
    const sorted = [...chaptersRaw].sort((a, b) => 
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );
    if (sortMode === 'za') sorted.reverse();
    return sorted;
  }, [chaptersRaw, sortMode]);

  const handleDeleteChapter = async (chapter: ModuleChapter) => {
    try {
      await deleteChapter.mutateAsync({ chapterId: chapter.id, moduleId });
      toast.success('Chapter deleted successfully');
      setDeleteChapterDialog(null);
    } catch {
      toast.error('Failed to delete chapter');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h2 className="text-lg font-semibold flex-1">{bookLabel}</h2>
        {canManage && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              setEditingChapter(null);
              setChapterModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Chapter
          </Button>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span className="text-sm font-medium">Chapters</span>
          {chapters && chapters.length > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {chapters.length}
            </span>
          )}
        </div>
        {showSortFilter && (
          <SortDropdown sortMode={sortMode} onSortChange={setSortMode} />
        )}
      </div>
      
      {chaptersLoading ? (
        <LectureListSkeleton count={5} />
      ) : chapters && chapters.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors group"
            >
              <button
                onClick={() => navigate(`/module/${moduleId}/chapter/${chapter.id}`)}
                className="flex-1 flex items-center gap-3 text-left"
              >
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[2.5rem] text-center">
                  {index + 1}
                </span>
                {chapter.icon_url && (
                  <img 
                    src={chapter.icon_url} 
                    alt="" 
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0" 
                  />
                )}
                <span className="flex-1 text-[15px] font-medium truncate">
                  {chapter.title}
                </span>
              </button>
              
              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingChapter(chapter);
                      setChapterModalOpen(true);
                    }}>
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
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No chapters available yet.</p>
          {canManage && (
            <Button 
              className="mt-4" 
              onClick={() => {
                setEditingChapter(null);
                setChapterModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add First Chapter
            </Button>
          )}
        </div>
      )}

      {/* Chapter/Lecture Form Modal */}
      <ChapterFormModal
        open={chapterModalOpen}
        onOpenChange={setChapterModalOpen}
        moduleId={moduleId}
        bookLabel={bookLabel}
        chapterPrefix="Chapter"
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
              This will also delete all content (videos, resources, assessments) associated with this chapter.
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

export function ModuleLearningTab({
  moduleId, 
  chapters, 
  chaptersLoading,
  selectorLabel = 'Department',
  canManageBooks = false,
  canManageChapters = false,
  selectedDepartmentId,
}: ModuleLearningTabProps) {
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  
  // Fetch books with metadata
  const { data: books, isLoading: booksLoading } = useModuleBooks(moduleId);
  
  // Fetch topics count for Pharmacology (filtered by moduleId)
  const { data: pharmacologyTopics } = useTopics(PHARMACOLOGY_DEPT_ID, moduleId);
  
  // Fetch chapter (lecture) counts per book
  const { data: lectureCounts } = useQuery({
    queryKey: ['book-chapter-counts', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('book_label')
        .eq('module_id', moduleId);
      
      if (error) throw error;
      
      // Count chapters per book
      const counts: Record<string, number> = {};
      for (const chapter of data || []) {
        const label = chapter.book_label || 'General';
        counts[label] = (counts[label] || 0) + 1;
      }
      return counts;
    },
  });
  
  // Modal states
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<ModuleBook | null>(null);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ModuleChapter | null>(null);
  
  // Delete confirmation states
  const [deleteBookDialog, setDeleteBookDialog] = useState<string | null>(null);
  const [deleteChapterDialog, setDeleteChapterDialog] = useState<ModuleChapter | null>(null);
  
  const deleteBook = useDeleteBook();
  const deleteChapter = useDeleteChapter();
  const reorderBooks = useReorderBooks();
  
  const { sortMode, setSortMode, sortedItems: sortedChapters } = useChapterSort(
    chapters,
    `kasrlearn_sort_${moduleId}`,
    'default'
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const hasChapters = chapters && chapters.length > 0;

  // Group chapters by book_label
  const groupedChapters = useMemo(() => {
    if (!hasChapters) return {};
    return sortedChapters.reduce((acc, chapter) => {
      const label = chapter.book_label || 'General';
      if (!acc[label]) acc[label] = [];
      acc[label].push(chapter);
      return acc;
    }, {} as Record<string, typeof sortedChapters>);
  }, [hasChapters, sortedChapters]);

  // Get book metadata for a label
  const getBookMetadata = (bookLabel: string): ModuleBook | undefined => {
    return books?.find(b => b.book_label === bookLabel);
  };

  // Get chapter prefix for a book
  const getChapterPrefix = (bookLabel: string): string => {
    return getBookMetadata(bookLabel)?.chapter_prefix || 'Ch';
  };

  const hasMultipleBooks = (books?.length || 0) > 1 || Object.keys(groupedChapters).length > 1;

  const sortedBooks = useMemo(() => {
    const list = books ? [...books] : [];
    return list.sort((a, b) => a.display_order - b.display_order);
  }, [books]);

  const handleAddBook = () => {
    setEditingBook(null);
    setBookModalOpen(true);
  };

  const handleEditBook = (bookLabel: string) => {
    const book = getBookMetadata(bookLabel);
    if (book) {
      setEditingBook(book);
      setBookModalOpen(true);
    }
  };

  const handleDeleteBook = async (bookLabel: string) => {
    try {
      await deleteBook.mutateAsync({ moduleId, bookLabel });
      toast.success('Department deleted successfully');
      setDeleteBookDialog(null);
    } catch {
      toast.error('Failed to delete department');
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && books) {
      const oldIndex = books.findIndex((b) => b.book_label === active.id);
      const newIndex = books.findIndex((b) => b.book_label === over.id);
      
      const newBooks = arrayMove(books, oldIndex, newIndex);
      const bookOrders = newBooks.map((book, index) => ({
        bookLabel: book.book_label,
        displayOrder: index,
      }));

      try {
        await reorderBooks.mutateAsync({ moduleId, bookOrders });
      } catch {
        toast.error('Failed to reorder departments');
      }
    }
  };

  const renderChapterList = (chaptersToRender: ModuleChapter[], bookLabel?: string) => {
    const prefix = bookLabel ? getChapterPrefix(bookLabel) : 'Ch';
    
    return (
      <div className="space-y-2">
        {canManageChapters && bookLabel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddChapter(bookLabel)}
            className="mb-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add {prefix}
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
                  {prefix} {chapter.chapter_number}
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
              No chapters yet. {canManageChapters && `Click "Add ${prefix}" to create one.`}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (chaptersLoading || booksLoading) {
    return <LectureListSkeleton count={5} />;
  }

  // If Pharmacology department is selected, show Topics view instead of chapters
  if (selectedDepartmentId === PHARMACOLOGY_DEPT_ID) {
    return (
      <PharmacologyTopicsView
        departmentId={PHARMACOLOGY_DEPT_ID}
        moduleId={moduleId}
        canManageTopics={canManageChapters}
      />
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

  // If a book is selected, show lectures directly (or Topics for Pharmacology)
  if (selectedBook) {
    // Check if this is Pharmacology - show Topics instead
    if (selectedBook.toLowerCase() === 'pharmacology') {
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
          
          <PharmacologyTopicsView
            departmentId={PHARMACOLOGY_DEPT_ID}
            moduleId={moduleId}
            canManageTopics={canManageChapters}
          />
        </div>
      );
    }

    // Show lectures directly for the selected book
    return (
      <BookLecturesView
        moduleId={moduleId}
        bookLabel={selectedBook}
        canManage={canManageChapters}
        onBack={() => setSelectedBook(null)}
      />
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

        {sortedBooks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedBooks.map(b => b.book_label)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-3">
                {sortedBooks.map((book) => {
                  const bookLectureCount = lectureCounts?.[book.book_label] || 0;
                  const isPharmacology = book.book_label.toLowerCase() === 'pharmacology';
                  return (
                    <SortableBookCard
                      key={book.book_label}
                      book={book}
                      lectureCount={bookLectureCount}
                      topicCount={isPharmacology ? pharmacologyTopics?.length : undefined}
                      isPharmacology={isPharmacology}
                      canManageBooks={canManageBooks}
                      onSelect={() => setSelectedBook(book.book_label)}
                      onEdit={() => handleEditBook(book.book_label)}
                      onDelete={() => setDeleteBookDialog(book.book_label)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
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
  const singleBookLabel = Object.keys(groupedChapters)[0] || 'General';
  const prefix = getChapterPrefix(singleBookLabel);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          Chapters
        </h2>
        <SortDropdown sortMode={sortMode} onSortChange={setSortMode} />
      </div>
      {renderChapterList(sortedChapters, singleBookLabel)}

      {/* Modals */}
      <ChapterFormModal
        open={chapterModalOpen}
        onOpenChange={setChapterModalOpen}
        moduleId={moduleId}
        bookLabel={singleBookLabel}
        chapterPrefix={prefix}
        editingChapter={editingChapter}
        existingChapters={chapters}
      />

      {/* Delete Chapter Confirmation */}
      <AlertDialog open={!!deleteChapterDialog} onOpenChange={() => setDeleteChapterDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {prefix}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteChapterDialog?.title}"? 
              This will also delete all content associated with this {prefix.toLowerCase()}.
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
