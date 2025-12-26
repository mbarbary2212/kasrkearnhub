import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SortDropdown } from '@/components/ui/sort-dropdown';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { useChapterSort } from '@/hooks/useChapterSort';
import { ModuleChapter } from '@/hooks/useChapters';
import { cn } from '@/lib/utils';

interface ModuleLearningTabProps {
  moduleId: string;
  chapters: ModuleChapter[] | undefined;
  chaptersLoading: boolean;
  selectorLabel?: string; // "Department" or "Book" - admin configurable in future
}

export function ModuleLearningTab({ 
  moduleId, 
  chapters, 
  chaptersLoading,
  selectorLabel = 'Department',
}: ModuleLearningTabProps) {
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  
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

  // If no books/departments, show chapters directly
  // If multiple books, show book selector first, then chapters
  // If single book (not "General"), show that book's chapters directly

  const renderChapterList = (chaptersToRender: ModuleChapter[]) => (
    <div className="border rounded-lg divide-y">
      {chaptersToRender.map((chapter) => (
        <button
          key={chapter.id}
          onClick={() => navigate(`/module/${moduleId}/chapter/${chapter.id}`)}
          className="w-full flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors text-left"
        >
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[3rem] text-center">
            Ch {chapter.chapter_number}
          </span>
          <span className="flex-1 text-[15px] font-medium truncate">
            {chapter.title}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      ))}
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

  if (!hasChapters) {
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
          <h2 className="text-lg font-semibold">{selectedBook}</h2>
        </div>
        
        <div className="flex justify-end">
          <SortDropdown sortMode={sortMode} onSortChange={setSortMode} />
        </div>
        
        {renderChapterList(bookChapters)}
      </div>
    );
  }

  // If multiple books/departments, show selector
  if (hasMultipleBooks) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          Select {selectorLabel}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {bookLabels.map((bookLabel) => {
            const chapterCount = groupedChapters[bookLabel].length;
            return (
              <Card 
                key={bookLabel}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedBook(bookLabel)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{bookLabel}</h3>
                    <p className="text-sm text-muted-foreground">
                      {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
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
      {renderChapterList(sortedChapters)}
    </div>
  );
}
