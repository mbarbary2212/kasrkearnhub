import { useMemo, useCallback, useState } from 'react';
import { FlashcardContent } from '@/hooks/useStudyResources';
import { FlashcardsStudentView } from './FlashcardsStudentView';
import { FlashcardClozeMode } from './FlashcardClozeMode';
import { FlashcardsAdminGrid } from './FlashcardsAdminGrid';
import { FlashcardsAdminTable } from './FlashcardsAdminTable';
import { ScheduledReviewBanner } from './ScheduledReviewBanner';
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { useAuthContext } from '@/contexts/AuthContext';
import { StudyResource } from '@/hooks/useStudyResources';
import { useFlashcardStars } from '@/hooks/useFlashcardStars';
import { useFlashcardSettings } from '@/hooks/useFlashcardSettings';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers, PenLine, LayoutGrid, Star, Filter, RotateCcw, Trash2, X, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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
import { BulkSectionAssignment, AutoTagSectionsButton } from '@/components/sections';
import { useBulkDeleteContent, useBulkConvertCardType } from '@/hooks/useContentBulkOperations';
import { toast } from 'sonner';

interface FlashcardsTabProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  /** Chapter ID - use for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - use for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
  moduleId?: string;
  onActiveItemChange?: (item: { item_id: string; item_label: string; item_index: number }) => void;
}

export function FlashcardsTab({ resources, canManage, onEdit, chapterId, topicId, moduleId, onActiveItemChange }: FlashcardsTabProps) {
  // Determine container ID - use exactly one of chapterId or topicId
  const containerId = chapterId || topicId;
  const { isAdmin, isTeacher } = useAuthContext();
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('cards');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<'cloze' | 'normal' | null>(null);
  
  // Synced stars across devices - supports both chapter and topic
  const { starredIds, toggleStar } = useFlashcardStars({ chapterId, topicId });
  const bulkDelete = useBulkDeleteContent('study_resources');
  const bulkConvert = useBulkConvertCardType();
  
  // Persisted settings - supports both chapter and topic
  const {
    settings,
    setMode,
    setShowMarkedOnly,
    resetToDefaults,
  } = useFlashcardSettings({ chapterId, topicId });

  const { mode: studentMode, showMarkedOnly } = settings;

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set((resources ?? []).map(r => r.id)));
  }, [resources]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync({
        ids: Array.from(selectedIds),
        chapterId,
        topicId,
      });
      toast.success(`Deleted ${selectedIds.size} flashcards`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to delete flashcards');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const handleBulkConvert = async () => {
    if (!convertTarget) return;
    try {
      await bulkConvert.mutateAsync({
        ids: Array.from(selectedIds),
        targetType: convertTarget,
        chapterId,
        topicId,
      });
      toast.success(`Converted ${selectedIds.size} cards to ${convertTarget === 'cloze' ? 'Cloze' : 'Classic'}`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to convert cards');
    } finally {
      setConvertTarget(null);
    }
  };

  // Wrap toggleStar to include container context (chapter or topic)
  const handleToggleStar = useCallback((cardId: string) => {
    const card = resources.find(r => r.id === cardId);
    // Pass both chapter_id and topic_id - hook will use whichever is set
    toggleStar(cardId, card?.chapter_id ?? undefined, card?.topic_id ?? undefined);
  }, [resources, toggleStar]);

  // Filter resources if showing marked only
  const filteredResources = useMemo(() => {
    const safeResources = resources ?? [];
    if (!showMarkedOnly) return safeResources;
    return safeResources.filter(r => starredIds.has(r.id));
  }, [resources, showMarkedOnly, starredIds]);

  // Count cards by type
  const cardCounts = useMemo(() => {
    const safeResources = filteredResources ?? [];
    let cloze = 0;
    let normal = 0;
    for (const r of safeResources) {
      const fc = r.content as FlashcardContent;
      if (fc.card_type === 'cloze' && fc.cloze_text && /\{\{c\d+::(.+?)\}\}/.test(fc.cloze_text)) {
        cloze++;
      } else {
        normal++;
      }
    }
    return { cloze, normal, all: safeResources.length };
  }, [filteredResources]);

  // Get all available topics for the current filter state
  const availableTopics = useMemo(() => {
    const safeResources = resources ?? [];
    const topics = new Set<string>();
    safeResources.forEach(r => topics.add(r.title));
    return Array.from(topics).sort();
  }, [resources]);

  // Admin view shows the grid with edit/delete controls (teachers are view-only)
  const showAdminView = isAdmin && canManage;

  if (showAdminView) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Multi-select controls */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size > 0 && selectedIds.size === (resources ?? []).length}
              onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
            {selectedIds.size > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 gap-1">
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
                {containerId && (
                  <BulkSectionAssignment
                    chapterId={chapterId}
                    topicId={topicId}
                    selectedIds={Array.from(selectedIds)}
                    contentTable="study_resources"
                    onComplete={clearSelection}
                  />
                )}
                <AutoTagSectionsButton chapterId={chapterId} topicId={topicId} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Convert Type
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setConvertTarget('cloze')}>
                      <PenLine className="h-3.5 w-3.5 mr-2" />
                      Convert to Cloze
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConvertTarget('normal')}>
                      <Layers className="h-3.5 w-3.5 mr-2" />
                      Convert to Classic
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="h-7 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
          <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
        </div>
        {adminViewMode === 'table' ? (
          <FlashcardsAdminTable
            resources={resources ?? []}
            chapterId={chapterId}
            moduleId={moduleId}
            onEdit={onEdit}
          />
        ) : (
          <FlashcardsAdminGrid
            resources={resources ?? []}
            canManage={canManage}
            onEdit={onEdit}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        )}

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} flashcards?</AlertDialogTitle>
              <AlertDialogDescription>
                This will soft-delete the selected flashcards. You can restore them later from the deleted items view.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleBulkDelete();
                }}
                disabled={bulkDelete.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Student view with mode selector
  return (
    <div className="space-y-4">
      {/* Scheduled Review Banner */}
      <ScheduledReviewBanner />

      {/* Mode Selector and Filter - Students Only */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button
          variant={studentMode === 'interactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('interactive')}
          className="gap-2"
        >
          <Layers className="w-4 h-4" />
          Classic
          <span className="text-xs opacity-70">({cardCounts.normal})</span>
        </Button>
        <Button
          variant={studentMode === 'cloze' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('cloze')}
          className="gap-2"
        >
          <PenLine className="w-4 h-4" />
          Cloze
          <span className="text-xs opacity-70">({cardCounts.cloze})</span>
        </Button>
        <Button
          variant={studentMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('all')}
          className="gap-2"
        >
          <LayoutGrid className="w-4 h-4" />
          All
          <span className="text-xs opacity-70">({cardCounts.all})</span>
        </Button>

        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
              {starredIds.size > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {starredIds.size}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={showMarkedOnly}
              onCheckedChange={setShowMarkedOnly}
            >
              <Star className="h-3 w-3 mr-2 text-amber-500" />
              Starred cards only ({starredIds.size})
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetToDefaults}>
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset all settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty state when showing marked only but none marked */}
      {showMarkedOnly && filteredResources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p>No starred flashcards yet.</p>
          <p className="text-sm mt-1">Click the star icon on any card to mark it for review.</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => setShowMarkedOnly(false)}
          >
            Show all cards
          </Button>
        </div>
      ) : (
        <>
          {/* Render selected mode */}
          {studentMode === 'interactive' ? (
            <FlashcardsStudentView 
              cards={filteredResources} 
              markedIds={starredIds}
              onToggleMark={handleToggleStar}
              availableTopics={availableTopics}
              chapterId={chapterId}
              topicId={topicId}
              onActiveItemChange={onActiveItemChange}
            />
          ) : studentMode === 'cloze' ? (
            <FlashcardClozeMode
              cards={filteredResources}
              markedIds={starredIds}
              onToggleMark={handleToggleStar}
              availableTopics={availableTopics}
              chapterId={chapterId}
              topicId={topicId}
              clozeOnly
              onActiveItemChange={onActiveItemChange}
            />
          ) : (
            <FlashcardClozeMode
              cards={filteredResources}
              markedIds={starredIds}
              onToggleMark={handleToggleStar}
              availableTopics={availableTopics}
              chapterId={chapterId}
              topicId={topicId}
              onActiveItemChange={onActiveItemChange}
            />
          )}
        </>
      )}
    </div>
  );
}
