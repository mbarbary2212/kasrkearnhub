import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Link2, Trash2, RotateCcw } from 'lucide-react';
import { MatchingQuestionCard } from './MatchingQuestionCard';
import { MatchingQuestionFormModal } from './MatchingQuestionFormModal';
import { MatchingQuestionBulkUploadModal } from './MatchingQuestionBulkUploadModal';
import { useDeleteMatchingQuestion, useRestoreMatchingQuestion, type MatchingQuestion } from '@/hooks/useMatchingQuestions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
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

interface MatchingQuestionListProps {
  questions: MatchingQuestion[];
  deletedQuestions?: MatchingQuestion[];
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  isAdmin: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
}

export function MatchingQuestionList({
  questions,
  deletedQuestions = [],
  moduleId,
  chapterId,
  topicId,
  isAdmin,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
}: MatchingQuestionListProps) {
  const auth = useAuthContext();

  const showAddControls = !!(
    auth.isTeacher ||
    auth.isAdmin ||
    auth.isModuleAdmin ||
    auth.isTopicAdmin ||
    auth.isDepartmentAdmin ||
    auth.isPlatformAdmin ||
    auth.isSuperAdmin
  );

  const { guard, dialog } = useAddPermissionGuard({ moduleId, chapterId, topicId });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MatchingQuestion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deleteMutation = useDeleteMatchingQuestion();
  const restoreMutation = useRestoreMatchingQuestion();

  const handleEdit = (question: MatchingQuestion) => {
    setEditingQuestion(question);
    setShowAddModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync({
      id: deleteId,
      moduleId,
      chapterId,
    });
    setDeleteId(null);
  };

  const handleRestore = async (question: MatchingQuestion) => {
    try {
      await restoreMutation.mutateAsync({
        id: question.id,
        moduleId,
        chapterId,
      });
    } catch (error) {
      toast.error('Failed to restore question');
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Combine active and deleted questions when showing deleted
  const displayQuestions = showDeleted ? [...questions, ...deletedQuestions] : questions;

  // For students: show nothing if no questions
  if (questions.length === 0 && !isAdmin && !showAddControls) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No matching questions available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dialog}
      {/* Admin controls */}
      {(showAddControls || showDeletedToggle) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {showAddControls && (
            <>
              <Button
                onClick={() =>
                  guard(() => {
                    setEditingQuestion(null);
                    setShowAddModal(true);
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
              <Button variant="outline" onClick={() => guard(() => setShowBulkModal(true))}>
                <Upload className="h-4 w-4 mr-1" />
                Bulk Import
              </Button>
            </>
          )}

          {/* Separate Show Deleted button - only visible to admins */}
          {showDeletedToggle && (
            <Button
              variant={showDeleted ? "secondary" : "outline"}
              size="default"
              className={cn(
                "gap-2",
                showDeleted && "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
              )}
              onClick={() => onShowDeletedChange?.(!showDeleted)}
            >
              <Trash2 className="h-4 w-4" />
              Show deleted ({deletedQuestions.length})
            </Button>
          )}
        </div>
      )}

      {/* Empty state for admin */}
      {displayQuestions.length === 0 && showAddControls && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No matching questions yet</p>
          <Button
            onClick={() =>
              guard(() => {
                setEditingQuestion(null);
                setShowAddModal(true);
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Add First Question
          </Button>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-4">
        {displayQuestions.map((question, index) => {
          const isDeleted = question.is_deleted;
          return (
            <div key={question.id} className={cn(isDeleted && "opacity-60")}>
              {isDeleted ? (
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">Deleted</Badge>
                    <span className="line-through text-muted-foreground">{question.instruction}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(question)}
                    className="h-8 gap-2 text-emerald-600 hover:text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </Button>
                </div>
              ) : (
                <MatchingQuestionCard
                  question={question}
                  index={index}
                  isAdmin={isAdmin}
                  onEdit={() => handleEdit(question)}
                  onDelete={() => setDeleteId(question.id)}
                  isExpanded={expandedId === question.id}
                  onToggleExpand={handleToggleExpand}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <MatchingQuestionFormModal
        open={showAddModal}
        onOpenChange={open => {
          setShowAddModal(open);
          if (!open) setEditingQuestion(null);
        }}
        moduleId={moduleId}
        chapterId={chapterId}
        topicId={topicId}
        question={editingQuestion}
      />

      <MatchingQuestionBulkUploadModal
        open={showBulkModal}
        onOpenChange={setShowBulkModal}
        moduleId={moduleId}
        chapterId={chapterId}
        topicId={topicId}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Matching Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The question will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
