import { useState, useMemo } from 'react';
import { shortenTitle } from '@/utils/shortenTitle';
import { useAuthContext } from '@/contexts/AuthContext';
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
import { CROSS_MODULE_BOOKS, resolveCrossModuleBook } from '@/lib/crossModuleBooks';
import { BookFormModal } from './BookFormModal';
import { ChapterFormModal } from './ChapterFormModal';
import { PharmacologyTopicsView } from './PharmacologyTopicsView';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChapterReadinessDot } from './ChapterReadinessDot';

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
  /** When provided (from ModulePage), student pill filtering is handled externally */
  externalActiveBookLabel?: string | null;
  /** When true, chapters with zero content items are hidden from the list */
  hideEmptyChapters?: boolean;
  /** Chapter status data from dashboard — used to determine which chapters have content */
  chapterContentMap?: Array<{ id: string; totalItems: number }>;
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
  const auth = useAuthContext();
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ModuleChapter | null>(null);
  const [deleteChapterDialog, setDeleteChapterDialog] = useState<ModuleChapter | null>(null);
  
  const deleteChapter = useDeleteChapter();
  
  // Cross-module book mapping
  const { fetchModuleId, fetchBookLabel } = resolveCrossModuleBook(moduleId, bookLabel);
  
  // Module IDs for SUR-423 and SUR-523 that show sort filter for Book 2 and Book 3
  const SURGERY_MODULE_IDS = [
    '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', // SUR-423
    '7f5167dd-b746-4ac6-94f3-109d637df861', // SUR-523
  ];
  const SORTABLE_BOOKS = ['Book 2', 'Book 3'];
  const showSortFilter = SURGERY_MODULE_IDS.includes(moduleId) && SORTABLE_BOOKS.includes(bookLabel);
  
  const [sortMode, setSortMode] = useState<SortMode>('default');
  
  const { data: chaptersRaw, isLoading: chaptersLoading } = useQuery({
    queryKey: ['module-chapters-for-book', fetchModuleId, fetchBookLabel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .eq('module_id', fetchModuleId)
        .eq('book_label', fetchBookLabel)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as ModuleChapter[];
    },
  });
  
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
          {chapters.map((chapter, index) => {
            const isAssigned = auth.isTopicAdmin && !auth.isTeacher
              ? auth.canManageChapter(chapter.id)
              : true;

            return (
            <div
              key={chapter.id}
              className={cn(
                "flex items-center gap-3 py-3.5 md:py-3 px-2 md:px-4 transition-colors group min-h-[44px]",
                isAssigned ? "hover:bg-muted/50" : "opacity-50 cursor-default"
              )}
            >
              {isAssigned ? (
              <button
                onClick={() => navigate(`/module/${moduleId}/chapter/${chapter.id}`)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                 <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[2.5rem] text-center flex-shrink-0">
                  {index + 1}
                </span>
                {chapter.icon_url && (
                  <img 
                    src={chapter.icon_url} 
                    alt="" 
                    className="w-7 h-7 md:w-9 md:h-9 rounded-lg object-cover flex-shrink-0" 
                  />
                )}
                <span className="flex-1 text-[15px] md:text-sm font-semibold md:font-medium truncate min-w-0">
                  <span className="md:hidden">{shortenTitle(chapter.title)}</span>
                  <span className="hidden md:inline">{chapter.title}</span>
                </span>
              </button>
              ) : (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[2.5rem] text-center flex-shrink-0">
                  {index + 1}
                </span>
                {chapter.icon_url && (
                  <img 
                    src={chapter.icon_url} 
                    alt="" 
                    className="w-7 h-7 md:w-9 md:h-9 rounded-lg object-cover flex-shrink-0" 
                  />
                )}
                <span className="flex-1 text-[15px] md:text-sm font-semibold md:font-medium truncate text-muted-foreground min-w-0">
                  <span className="md:hidden">{shortenTitle(chapter.title)}</span>
                  <span className="hidden md:inline">{chapter.title}</span>
                </span>
              </div>
              )}
              
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
              ) : isAssigned ? (
                <div className="flex items-center gap-1 flex-shrink-0 w-6 md:w-10 justify-end">
                  <ChapterReadinessDot chapterId={chapter.id} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                </div>
              ) : null}
            </div>
          );
          })}
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

      <ChapterFormModal
        open={chapterModalOpen}
        onOpenChange={setChapterModalOpen}
        moduleId={moduleId}
        bookLabel={bookLabel}
        chapterPrefix="Chapter"
        editingChapter={editingChapter}
        existingChapters={chapters}
      />

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

// ─── Student pill-filtered chapter view (no intermediate screen) ───
function StudentBookPillView({
  moduleId,
  fetchModuleId,
  fetchBookLabel,
  activeBookLabel,
  sortedBooks,
  onSelectPill,
}: {
  moduleId: string;
  fetchModuleId: string;
  fetchBookLabel: string;
  activeBookLabel: string;
  sortedBooks: ModuleBook[];
  onSelectPill: (label: string) => void;
}) {
  const navigate = useNavigate();
  const auth = useAuthContext();

  const { data: chapters, isLoading } = useQuery({
    queryKey: ['module-chapters-for-book', fetchModuleId, fetchBookLabel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .eq('module_id', fetchModuleId)
        .eq('book_label', fetchBookLabel)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as ModuleChapter[];
    },
  });

  return (
    <div className="space-y-3">
      {/* Hint banner */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <BookOpen className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground">Choose a chapter to start learning</p>
      </div>

      {sortedBooks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sortedBooks.map((book) => (
            <button
              key={book.book_label}
              onClick={() => onSelectPill(book.book_label)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeBookLabel === book.book_label
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {book.description || book.book_label}
            </button>
          ))}
        </div>
      )}

      {/* Chapter list */}
      {isLoading ? (
        <LectureListSkeleton count={5} />
      ) : chapters && chapters.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {chapters.map((chapter, index) => {
            const isAssigned = auth.isTopicAdmin && !auth.isTeacher
              ? auth.canManageChapter(chapter.id)
              : true;

            return (
              <div
                key={chapter.id}
                className={cn(
                  "flex items-center gap-3 py-3.5 md:py-3 px-2 md:px-4 transition-colors group min-h-[44px]",
                  isAssigned ? "hover:bg-muted/50" : "opacity-50 cursor-default"
                )}
              >
                {isAssigned ? (
                  <button
                    onClick={() => navigate(`/module/${moduleId}/chapter/${chapter.id}`)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[2.5rem] text-center flex-shrink-0">
                      {index + 1}
                    </span>
                    {chapter.icon_url && (
                      <img src={chapter.icon_url} alt="" className="w-7 h-7 md:w-9 md:h-9 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <span className="flex-1 text-[15px] md:text-sm font-semibold md:font-medium truncate min-w-0">
                      <span className="md:hidden">{shortenTitle(chapter.title)}</span>
                      <span className="hidden md:inline">{chapter.title}</span>
                    </span>
                  </button>
                ) : (
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[2.5rem] text-center flex-shrink-0">
                      {index + 1}
                    </span>
                    {chapter.icon_url && (
                      <img src={chapter.icon_url} alt="" className="w-7 h-7 md:w-9 md:h-9 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <span className="flex-1 text-[15px] md:text-sm font-semibold md:font-medium truncate text-muted-foreground min-w-0">
                      <span className="md:hidden">{shortenTitle(chapter.title)}</span>
                      <span className="hidden md:inline">{chapter.title}</span>
                    </span>
                  </div>
                )}
                {isAssigned && (
                  <div className="flex items-center gap-1 flex-shrink-0 w-6 md:w-10 justify-end">
                    <ChapterReadinessDot chapterId={chapter.id} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No chapters available yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───
export function ModuleLearningTab({
  moduleId, 
  chapters: rawChapters, 
  chaptersLoading,
  selectorLabel = 'Department',
  canManageBooks = false,
  canManageChapters = false,
  selectedDepartmentId,
  externalActiveBookLabel,
  hideEmptyChapters = false,
  chapterContentMap,
}: ModuleLearningTabProps) {
  // Filter out empty chapters for students when dashboard data is available
  const chapters = useMemo(() => {
    if (!hideEmptyChapters || !chapterContentMap || !rawChapters) return rawChapters;
    const contentChapterIds = new Set(
      chapterContentMap.filter(c => c.totalItems > 0).map(c => c.id)
    );
    return rawChapters.filter(ch => contentChapterIds.has(ch.id));
  }, [hideEmptyChapters, chapterContentMap, rawChapters]);

  const navigate = useNavigate();
  const auth = useAuthContext();
  const storageKey = `kasrlearn_book_${moduleId}`;
  const [selectedBook, setSelectedBook] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey);
    }
    return null;
  });
  
  // Fetch books with metadata
  const { data: books, isLoading: booksLoading } = useModuleBooks(moduleId);
  
  // Fetch topics count for Pharmacology (filtered by moduleId)
  const { data: pharmacologyTopics } = useTopics(PHARMACOLOGY_DEPT_ID, moduleId);
  
  // Cross-module book mapping (uses shared constant)
  
  // Fetch chapter counts per book
  const { data: lectureCounts } = useQuery({
    queryKey: ['book-chapter-counts', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('book_label')
        .eq('module_id', moduleId);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      for (const chapter of data || []) {
        const label = chapter.book_label || 'General';
        counts[label] = (counts[label] || 0) + 1;
      }
      
      const crossBooks = CROSS_MODULE_BOOKS[moduleId];
      if (crossBooks) {
        for (const [targetLabel, mapping] of Object.entries(crossBooks)) {
          const { data: crossData, error: crossError } = await supabase
            .from('module_chapters')
            .select('book_label')
            .eq('module_id', mapping.sourceModuleId)
            .eq('book_label', mapping.sourceBookLabel);
          
          if (!crossError && crossData) {
            counts[targetLabel] = (counts[targetLabel] || 0) + crossData.length;
          }
        }
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

  const getBookMetadata = (bookLabel: string): ModuleBook | undefined => {
    return books?.find(b => b.book_label === bookLabel);
  };

  const getChapterPrefix = (bookLabel: string): string => {
    return getBookMetadata(bookLabel)?.chapter_prefix || 'Ch';
  };

  const hasMultipleBooks = (books?.length || 0) > 1 || Object.keys(groupedChapters).length > 1;

  const sortedBooks = useMemo(() => {
    const list = books ? [...books] : [];
    return list.sort((a, b) => a.display_order - b.display_order);
  }, [books]);

  // For students: determine active pill
  const activeBookLabel = useMemo(() => {
    if (!hasMultipleBooks || sortedBooks.length === 0) return null;
    if (selectedBook && sortedBooks.some(b => b.book_label === selectedBook)) {
      return selectedBook;
    }
    return sortedBooks[0]?.book_label || null;
  }, [hasMultipleBooks, sortedBooks, selectedBook]);

  const handleSelectBookPill = (bookLabel: string) => {
    setSelectedBook(bookLabel);
    localStorage.setItem(storageKey, bookLabel);
  };

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
          {chaptersToRender.map((chapter) => {
            const isAssigned = auth.isTopicAdmin && !auth.isTeacher
              ? auth.canManageChapter(chapter.id)
              : true;

            return (
            <div
              key={chapter.id}
              className={cn(
                "flex items-center gap-3 py-3 px-2 md:px-4 transition-colors group",
                isAssigned ? "hover:bg-muted/50" : "opacity-50 cursor-default"
              )}
            >
              {isAssigned ? (
              <button
                onClick={() => navigate(`/module/${moduleId}/chapter/${chapter.id}`)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[3rem] text-center flex-shrink-0">
                  {prefix} {chapter.chapter_number}
                </span>
                <span className="flex-1 text-xs md:text-sm font-medium truncate min-w-0">
                  {chapter.title}
                </span>
              </button>
              ) : (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[3rem] text-center flex-shrink-0">
                  {prefix} {chapter.chapter_number}
                </span>
                <span className="flex-1 text-xs md:text-sm font-medium truncate text-muted-foreground min-w-0">
                  {chapter.title}
                </span>
              </div>
              )}
              
              {canManageChapters && isAssigned ? (
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
              ) : isAssigned ? (
                <div className="flex items-center gap-1 flex-shrink-0 w-6 md:w-10 justify-end">
                  <ChapterReadinessDot chapterId={chapter.id} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                </div>
              ) : null}
            </div>
          );
          })}
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

  // If Pharmacology department is selected, show Topics view
  if (selectedDepartmentId === PHARMACOLOGY_DEPT_ID) {
    return (
      <PharmacologyTopicsView
        departmentId={PHARMACOLOGY_DEPT_ID}
        moduleId={moduleId}
        canManageTopics={canManageChapters}
      />
    );
  }

  // Empty state
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

  // Hint banner for students
  const showStudentHint = hasChapters && !canManageBooks && !canManageChapters;

  if (externalActiveBookLabel && !canManageBooks) {
    // Pharmacology special case
    if (externalActiveBookLabel.toLowerCase() === 'pharmacology') {
      return (
        <PharmacologyTopicsView
          departmentId={PHARMACOLOGY_DEPT_ID}
          moduleId={moduleId}
          canManageTopics={false}
        />
      );
    }

    const resolved = resolveCrossModuleBook(moduleId, externalActiveBookLabel);
    
    return (
      <StudentBookPillView
        moduleId={moduleId}
        fetchModuleId={resolved.fetchModuleId}
        fetchBookLabel={resolved.fetchBookLabel}
        activeBookLabel={externalActiveBookLabel}
        sortedBooks={[]} // pills rendered externally, pass empty
        onSelectPill={() => {}} // no-op, handled by parent
      />
    );
  }

  // Legacy: if multiple books and no external control (shouldn't happen for students now)
  if (hasMultipleBooks && !canManageBooks && activeBookLabel) {
    if (activeBookLabel.toLowerCase() === 'pharmacology') {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {sortedBooks.map((book) => (
              <button
                key={book.book_label}
                onClick={() => handleSelectBookPill(book.book_label)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  activeBookLabel === book.book_label
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {book.description || book.book_label}
              </button>
            ))}
          </div>
          <PharmacologyTopicsView
            departmentId={PHARMACOLOGY_DEPT_ID}
            moduleId={moduleId}
            canManageTopics={false}
          />
        </div>
      );
    }

    const resolved = resolveCrossModuleBook(moduleId, activeBookLabel);
    
    return (
      <StudentBookPillView
        moduleId={moduleId}
        fetchModuleId={resolved.fetchModuleId}
        fetchBookLabel={resolved.fetchBookLabel}
        activeBookLabel={activeBookLabel}
        sortedBooks={sortedBooks}
        onSelectPill={handleSelectBookPill}
      />
    );
  }

  // ─── ADMIN VIEW: if a book is selected, show its chapters ───
  if (selectedBook && canManageBooks) {
    if (selectedBook.toLowerCase() === 'pharmacology') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBook(null)} className="gap-1">
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

    return (
      <BookLecturesView
        moduleId={moduleId}
        bookLabel={selectedBook}
        canManage={canManageChapters}
        onBack={() => setSelectedBook(null)}
      />
    );
  }

  // ─── ADMIN VIEW: book selector cards ───
  if (hasMultipleBooks && canManageBooks) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            {hasMultipleBooks ? `Select ${selectorLabel}` : `${selectorLabel}s`}
          </h2>
          <Button size="sm" variant="outline" onClick={handleAddBook}>
            <Plus className="w-4 h-4 mr-1" />
            Add {selectorLabel}
          </Button>
        </div>

        {sortedBooks.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedBooks.map(b => b.book_label)} strategy={verticalListSortingStrategy}>
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
            <Button onClick={handleAddBook}>
              <Plus className="w-4 h-4 mr-1" />
              Add First {selectorLabel}
            </Button>
          </div>
        )}

        <BookFormModal open={bookModalOpen} onOpenChange={setBookModalOpen} moduleId={moduleId} editingBook={editingBook} />

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
      {/* Inline guidance card for students */}
      {!auth.isAdmin && !auth.isTeacher && !auth.isPlatformAdmin && !auth.isSuperAdmin && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground mb-0.5">Start Learning</h3>
              <p className="text-sm text-muted-foreground">Choose a chapter below to access resources, practice questions, and more.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          Chapters
        </h2>
        <SortDropdown sortMode={sortMode} onSortChange={setSortMode} />
      </div>
      <div className={cn(!auth.isAdmin && !auth.isTeacher && !auth.isPlatformAdmin && !auth.isSuperAdmin && "ring-2 ring-primary/15 rounded-lg")}>
        {renderChapterList(sortedChapters, singleBookLabel)}
      </div>

      <ChapterFormModal
        open={chapterModalOpen}
        onOpenChange={setChapterModalOpen}
        moduleId={moduleId}
        bookLabel={singleBookLabel}
        chapterPrefix={prefix}
        editingChapter={editingChapter}
        existingChapters={chapters}
      />

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
