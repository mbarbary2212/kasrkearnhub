import { FlashcardsStudentView } from './FlashcardsStudentView';
import { FlashcardsAdminGrid } from './FlashcardsAdminGrid';
import { useAuthContext } from '@/contexts/AuthContext';
import { StudyResource } from '@/hooks/useStudyResources';

interface FlashcardsTabProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

export function FlashcardsTab({ resources, canManage, onEdit }: FlashcardsTabProps) {
  const { isAdmin, isTeacher } = useAuthContext();
  
  // Admin/Teacher view shows the grid with edit/delete controls
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

  // Student view shows Anki-style single card focus
  return <FlashcardsStudentView cards={resources} />;
}
