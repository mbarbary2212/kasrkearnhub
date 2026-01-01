import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  BookOpen, 
  ChevronDown, 
  CheckCircle2, 
  XCircle,
  Info,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  book_label: string | null;
}

interface Book {
  label: string;
  chapters: Chapter[];
}

interface StudyPlanBaselineChaptersProps {
  selectedModuleId: string | null;
  selectedModuleName: string;
  completedChapterIds: Set<string>;
  onToggleChapter: (chapterId: string, isCompleted: boolean) => void;
  onMarkAllInBook: (chapterIds: string[], isCompleted: boolean) => void;
}

export function StudyPlanBaselineChapters({
  selectedModuleId,
  selectedModuleName,
  completedChapterIds,
  onToggleChapter,
  onMarkAllInBook,
}: StudyPlanBaselineChaptersProps) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());

  // Fetch chapters for the selected module
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ['module-chapters-baseline', selectedModuleId],
    queryFn: async () => {
      if (!selectedModuleId) return [];
      
      const { data, error } = await supabase
        .from('module_chapters')
        .select('id, title, chapter_number, book_label')
        .eq('module_id', selectedModuleId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!selectedModuleId,
  });

  // Auto-expand first book when data loads
  useEffect(() => {
    if (chapters.length > 0 && expandedBooks.size === 0) {
      const firstBook = chapters[0]?.book_label || 'Main';
      setExpandedBooks(new Set([firstBook]));
    }
  }, [chapters]);

  // Group chapters by book
  const books: Book[] = [];
  const bookMap: Record<string, Chapter[]> = {};
  
  chapters.forEach((chapter) => {
    const bookLabel = chapter.book_label || 'Main';
    if (!bookMap[bookLabel]) {
      bookMap[bookLabel] = [];
    }
    bookMap[bookLabel].push(chapter);
  });
  
  Object.entries(bookMap).forEach(([label, chaps]) => {
    books.push({ label, chapters: chaps });
  });

  // No module selected state
  if (!selectedModuleId) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-muted">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Select a module to set what you've already studied
          </p>
          <p className="text-xs text-muted-foreground">
            Use the module selector at the top of the page to choose a specific module.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-muted">
        <BookOpen className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            No chapters found for {selectedModuleName}
          </p>
          <p className="text-xs text-muted-foreground">
            Chapter data will be used when available. For now, baseline will be calculated from your selections above.
          </p>
        </div>
      </div>
    );
  }

  const totalChapters = chapters.length;
  const completedCount = chapters.filter(c => completedChapterIds.has(c.id)).length;
  const completionPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  const toggleBookExpand = (label: string) => {
    const newSet = new Set(expandedBooks);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setExpandedBooks(newSet);
  };

  return (
    <div className="space-y-4">
      {/* Module header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{selectedModuleName}</span>
        </div>
        <Badge variant={completionPercent > 0 ? 'default' : 'secondary'}>
          {completedCount}/{totalChapters} chapters ({completionPercent}%)
        </Badge>
      </div>

      {/* Books with chapters */}
      <div className="space-y-2">
        {books.map((book) => {
          const bookChapterIds = book.chapters.map(c => c.id);
          const bookCompletedCount = book.chapters.filter(c => completedChapterIds.has(c.id)).length;
          const allBookCompleted = bookCompletedCount === book.chapters.length;
          const someBookCompleted = bookCompletedCount > 0 && !allBookCompleted;
          const isExpanded = expandedBooks.has(book.label);

          return (
            <Collapsible 
              key={book.label} 
              open={isExpanded}
              onOpenChange={() => toggleBookExpand(book.label)}
            >
              <div className="border rounded-lg overflow-hidden">
                {/* Book header */}
                <CollapsibleTrigger asChild>
                  <button className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className="text-sm font-medium truncate">{book.label}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {bookCompletedCount}/{book.chapters.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 ml-6 sm:ml-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAllInBook(bookChapterIds, true);
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                        <span className="hidden xs:inline">Mark all</span>
                        <span className="xs:hidden">All</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAllInBook(bookChapterIds, false);
                        }}
                      >
                        <XCircle className="w-3 h-3 mr-1 shrink-0" />
                        Clear
                      </Button>
                    </div>
                  </button>
                </CollapsibleTrigger>

                {/* Chapter list */}
                <CollapsibleContent>
                  <div className="divide-y">
                    {book.chapters.map((chapter) => {
                      const isCompleted = completedChapterIds.has(chapter.id);
                      return (
                        <label
                          key={chapter.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={(checked) => onToggleChapter(chapter.id, !!checked)}
                          />
                          <span className={`text-sm flex-1 ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                            Ch {chapter.chapter_number}: {chapter.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
