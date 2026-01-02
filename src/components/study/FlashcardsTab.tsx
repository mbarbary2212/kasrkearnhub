import { useMemo, useCallback } from 'react';
import { FlashcardsStudentView } from './FlashcardsStudentView';
import { FlashcardsSlideshowMode } from './FlashcardsSlideshowMode';
import { FlashcardsAdminGrid } from './FlashcardsAdminGrid';
import { useAuthContext } from '@/contexts/AuthContext';
import { StudyResource } from '@/hooks/useStudyResources';
import { useFlashcardStars } from '@/hooks/useFlashcardStars';
import { useFlashcardSettings } from '@/hooks/useFlashcardSettings';
import { Button } from '@/components/ui/button';
import { Layers, Play, Star, Filter, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface FlashcardsTabProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  chapterId?: string;
}

export function FlashcardsTab({ resources, canManage, onEdit, chapterId }: FlashcardsTabProps) {
  const { isAdmin, isTeacher } = useAuthContext();
  
  // Synced stars across devices
  const { starredIds, toggleStar } = useFlashcardStars(chapterId);
  
  // Persisted settings
  const {
    settings,
    setMode,
    setShowMarkedOnly,
    resetToDefaults,
  } = useFlashcardSettings(chapterId);

  const { mode: studentMode, showMarkedOnly } = settings;

  // Wrap toggleStar to include chapter context
  const handleToggleStar = useCallback((cardId: string) => {
    const card = resources.find(r => r.id === cardId);
    toggleStar(cardId, card?.chapter_id);
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
      <FlashcardsAdminGrid
        resources={resources ?? []}
        canManage={canManage}
        onEdit={onEdit}
      />
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
            />
          ) : (
            <FlashcardsSlideshowMode 
              cards={filteredResources}
              markedIds={starredIds}
              onToggleMark={handleToggleStar}
              chapterId={chapterId}
            />
          )}
        </>
      )}
    </div>
  );
}
