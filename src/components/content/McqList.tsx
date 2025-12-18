import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { McqCard } from './McqCard';
import { McqFormModal } from './McqFormModal';
import { useDeleteMcq, type Mcq } from '@/hooks/useMcqs';

interface McqListProps {
  mcqs: Mcq[];
  moduleId: string;
  chapterId?: string | null;
  isAdmin: boolean;
}

export function McqList({ mcqs, moduleId, chapterId, isAdmin }: McqListProps) {
  const [editingMcq, setEditingMcq] = useState<Mcq | null>(null);
  const [deletingMcq, setDeletingMcq] = useState<Mcq | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const deleteMutation = useDeleteMcq();

  const handleDelete = () => {
    if (!deletingMcq) return;
    
    deleteMutation.mutate(
      { id: deletingMcq.id, moduleId, chapterId },
      { onSuccess: () => setDeletingMcq(null) }
    );
  };

  if (mcqs.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No MCQs available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Question Button - only for admins */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      )}

      {/* MCQ Cards */}
      {mcqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No MCQs yet. Click "Add Question" to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mcqs.map((mcq, index) => (
            <McqCard
              key={mcq.id}
              mcq={mcq}
              index={index}
              isAdmin={isAdmin}
              onEdit={() => setEditingMcq(mcq)}
              onDelete={() => setDeletingMcq(mcq)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <McqFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        moduleId={moduleId}
        chapterId={chapterId}
        isAdmin={isAdmin}
      />

      {/* Edit Modal */}
      {editingMcq && (
        <McqFormModal
          open={!!editingMcq}
          onOpenChange={(open) => !open && setEditingMcq(null)}
          moduleId={moduleId}
          chapterId={chapterId}
          mcq={editingMcq}
          isAdmin={isAdmin}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMcq} onOpenChange={(open) => !open && setDeletingMcq(null)}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MCQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
              <br />
              <span className="font-medium mt-2 block text-foreground">
                "{deletingMcq?.stem.slice(0, 100)}..."
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
