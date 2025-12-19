import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudyResource, TableContent } from '@/hooks/useStudyResources';
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

interface TableResourceViewProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  onDelete?: (resource: StudyResource) => void;
}

export function TableResourceView({ resources, canManage, onEdit, onDelete }: TableResourceViewProps) {
  const [deleteTarget, setDeleteTarget] = useState<StudyResource | null>(null);

  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tables available
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {resources.map((resource) => (
          <TableCard
            key={resource.id}
            resource={resource}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={(r) => setDeleteTarget(r)}
          />
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete table?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget && onDelete) {
                  onDelete(deleteTarget);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface TableCardProps {
  resource: StudyResource;
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  onDelete?: (resource: StudyResource) => void;
}

function TableCard({ resource, canManage, onEdit, onDelete }: TableCardProps) {
  const content = resource.content as TableContent;

  if (!content.headers || !content.rows) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-base font-semibold text-foreground">{resource.title}</div>
        <p className="text-sm text-muted-foreground">Invalid table data</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-semibold text-foreground">{resource.title}</div>
        {canManage && (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onEdit?.(resource)}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(resource)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {content.headers.map((header, i) => (
                <th
                  key={i}
                  className="border border-border px-3 py-2 text-left text-sm font-semibold bg-muted"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-accent/30">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-border px-3 py-2 text-sm">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
