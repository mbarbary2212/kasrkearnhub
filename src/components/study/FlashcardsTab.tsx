import { useMemo, useCallback, useState } from 'react';
import { FlashcardsStudentView } from './FlashcardsStudentView';
import { FlashcardsSlideshowMode } from './FlashcardsSlideshowMode';
import { FlashcardsAdminGrid } from './FlashcardsAdminGrid';
import { FlashcardsAdminTable } from './FlashcardsAdminTable';
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { useAuthContext } from '@/contexts/AuthContext';
import { StudyResource } from '@/hooks/useStudyResources';
import { useFlashcardStars } from '@/hooks/useFlashcardStars';
import { useFlashcardSettings } from '@/hooks/useFlashcardSettings';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers, Play, Star, Filter, RotateCcw, Trash2, X } from 'lucide-react';
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
import { BulkSectionAssignment } from '@/components/sections';
import { useBulkDeleteContent } from '@/hooks/useContentBulkOperations';
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
}

export function FlashcardsTab({ resources, canManage, onEdit, chapterId, topicId, moduleId }: FlashcardsTabProps) {
  // Determine container ID - use exactly one of chapterId or topicId
  const containerId = chapterId || topicId;
  const { isAdmin, isTeacher } = useAuthContext();
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('cards');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  // Synced stars across devices - supports both chapter and topic
  const { starredIds, toggleStar } = useFlashcardStars({ chapterId, topicId });
  const bulkDelete = useBulkDeleteContent('study_resources');
  
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

  // Get all available topics for the current filter state
  const availableTopics = useMemo(() => {
    const safeResources = resources ?? [];
    const topics = new Set<string>();
    safeResources.forEach(r => topics.add(r.title));
    return Array.from(topics).sort();
  }, [resources]);

  // Admin/Teacher view shows the grid with edit/delete controls
  const showAdminView = (isAdmin || isTeacher) && canManage;

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
      {/* Mode Selector and Filter - Students Only */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button
          variant={studentMode === 'slideshow' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('slideshow')}
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          Slideshow Mode
        </Button>
        <Button
          variant={studentMode === 'interactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('interactive')}
          className="gap-2"
        >
          <Layers className="w-4 h-4" />
          Interactive Mode
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
            />
          ) : (
            <FlashcardsSlideshowMode 
              cards={filteredResources}
              markedIds={starredIds}
              onToggleMark={handleToggleStar}
              chapterId={chapterId}
              topicId={topicId}
            />
          )}
        </>
      )}
    </div>
  );
}
