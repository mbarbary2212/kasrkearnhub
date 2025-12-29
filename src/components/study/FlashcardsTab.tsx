import { useState, useMemo, useCallback } from 'react';
import { FlashcardsStudentView } from './FlashcardsStudentView';
import { FlashcardsSlideshowMode } from './FlashcardsSlideshowMode';
import { FlashcardsAdminGrid } from './FlashcardsAdminGrid';
import { useAuthContext } from '@/contexts/AuthContext';
import { StudyResource } from '@/hooks/useStudyResources';
import { Button } from '@/components/ui/button';
import { Layers, Play, Star, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FlashcardsTabProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

type StudentMode = 'interactive' | 'slideshow';

export function FlashcardsTab({ resources, canManage, onEdit }: FlashcardsTabProps) {
  const { isAdmin, isTeacher } = useAuthContext();
  const [studentMode, setStudentMode] = useState<StudentMode>('slideshow');
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  
  // Toggle mark for a flashcard
  const toggleMark = useCallback((id: string) => {
    setMarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Filter resources if showing marked only
  const filteredResources = useMemo(() => {
    if (!showMarkedOnly) return resources;
    return resources.filter(r => markedIds.has(r.id));
  }, [resources, showMarkedOnly, markedIds]);

  // Admin/Teacher view shows the grid with edit/delete controls
  // NO slideshow mode for admins
  const showAdminView = (isAdmin || isTeacher) && canManage;

  if (showAdminView) {
    return (
      <FlashcardsAdminGrid
        resources={resources}
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
          onClick={() => setStudentMode('slideshow')}
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          Slideshow Mode
        </Button>
        <Button
          variant={studentMode === 'interactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStudentMode('interactive')}
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
              {markedIds.size > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {markedIds.size}
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
              Marked for review ({markedIds.size})
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty state when showing marked only but none marked */}
      {showMarkedOnly && filteredResources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p>No marked flashcards.</p>
          <p className="text-sm mt-1">Click the star icon on any card to mark it for review.</p>
        </div>
      ) : (
        <>
          {/* Render selected mode */}
          {studentMode === 'interactive' ? (
            <FlashcardsStudentView 
              cards={filteredResources} 
              markedIds={markedIds}
              onToggleMark={toggleMark}
            />
          ) : (
            <FlashcardsSlideshowMode 
              cards={filteredResources}
              markedIds={markedIds}
              onToggleMark={toggleMark}
            />
          )}
        </>
      )}
    </div>
  );
}
