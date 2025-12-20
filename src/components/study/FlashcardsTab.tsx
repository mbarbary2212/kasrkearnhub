import { useState } from 'react';
import { FlashcardsStudentView } from './FlashcardsStudentView';
import { FlashcardsSlideshowMode } from './FlashcardsSlideshowMode';
import { FlashcardsAdminGrid } from './FlashcardsAdminGrid';
import { useAuthContext } from '@/contexts/AuthContext';
import { StudyResource } from '@/hooks/useStudyResources';
import { Button } from '@/components/ui/button';
import { Layers, Play } from 'lucide-react';

interface FlashcardsTabProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

type StudentMode = 'interactive' | 'slideshow';

export function FlashcardsTab({ resources, canManage, onEdit }: FlashcardsTabProps) {
  const { isAdmin, isTeacher } = useAuthContext();
  const [studentMode, setStudentMode] = useState<StudentMode>('slideshow');
  
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
      {/* Mode Selector - Students Only */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={studentMode === 'interactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStudentMode('interactive')}
          className="gap-2"
        >
          <Layers className="w-4 h-4" />
          Interactive Mode
        </Button>
        <Button
          variant={studentMode === 'slideshow' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStudentMode('slideshow')}
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          Slideshow Mode
        </Button>
      </div>

      {/* Render selected mode */}
      {studentMode === 'interactive' ? (
        <FlashcardsStudentView cards={resources} />
      ) : (
        <FlashcardsSlideshowMode cards={resources} />
      )}
    </div>
  );
}
