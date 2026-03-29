import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudyResource, StudyResourceType } from '@/hooks/useStudyResources';
import { WorkedCaseCard } from './WorkedCaseCard';
import { Stethoscope } from 'lucide-react';

interface ClinicalToolsSectionProps {
  /** @deprecated Old algorithm resources — kept for backward compat but no longer rendered */
  algorithms?: StudyResource[];
  workedCases: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  onAdd?: (type: StudyResourceType) => void;
  onBulkUpload?: (type: StudyResourceType) => void;
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
}

/**
 * Clinical Tools Section — now only renders Worked Cases.
 * Algorithms (Pathways) have moved to the Interactive section.
 */
export function ClinicalToolsSection({
  workedCases,
  canManage = false,
  onEdit,
  onAdd,
}: ClinicalToolsSectionProps) {
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant="outline" onClick={() => onAdd?.('clinical_case_worked')}>
            <Plus className="w-3 h-3 mr-1" /> Add Worked Case
          </Button>
        </div>
      )}

      {workedCases.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No worked cases yet.</p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Worked Case" to create structured clinical case solutions.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {workedCases.map((resource) => (
            <WorkedCaseCard key={resource.id} resource={resource} canManage={canManage} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
