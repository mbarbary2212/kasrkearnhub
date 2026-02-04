import { useState, useMemo } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { TrueFalseCard } from './TrueFalseCard';
import { TrueFalseFormModal } from './TrueFalseFormModal';
import { TrueFalseBulkUploadModal } from './TrueFalseBulkUploadModal';
import { 
  useDeleteTrueFalseQuestion, 
  useRestoreTrueFalseQuestion,
  type TrueFalseQuestion,
} from '@/hooks/useTrueFalseQuestions';
import { useChapterQuestionAttempts } from '@/hooks/useQuestionAttempts';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import type { Json } from '@/integrations/supabase/types';

interface TrueFalseListProps {
  questions: TrueFalseQuestion[];
  deletedQuestions?: TrueFalseQuestion[];
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  isAdmin: boolean;
  showDeleted?: boolean;
}

export function TrueFalseList({ 
  questions, 
  deletedQuestions = [],
  moduleId, 
  chapterId, 
  topicId,
  isAdmin,
  showDeleted = false,
}: TrueFalseListProps) {
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

  const {
    guard,
    dialog,
    canManage: canManageContent,
  } = useAddPermissionGuard({ moduleId, chapterId });
  
  const [editingQuestion, setEditingQuestion] = useState<TrueFalseQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<TrueFalseQuestion | null>(null);
  const [restoringQuestion, setRestoringQuestion] = useState<TrueFalseQuestion | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const deleteMutation = useDeleteTrueFalseQuestion();
  const restoreMutation = useRestoreTrueFalseQuestion();
  
  // Question attempt tracking (use 'mcq' type for DB compatibility)
  const { data: questionAttempts = [] } = useChapterQuestionAttempts(
    chapterId ?? undefined, 
    'mcq'
  );

  // Create a map of question attempts for quick lookup
  const attemptMap = useMemo(() => {
    const map = new Map<string, { is_correct: boolean | null; selected_answer: Json }>();
    questionAttempts.forEach(a => map.set(a.question_id, {
      is_correct: a.is_correct,
      selected_answer: a.selected_answer as Json,
    }));
    return map;
  }, [questionAttempts]);

  const displayQuestions = showDeleted ? deletedQuestions : questions;

  const handleDelete = () => {
    if (!deletingQuestion || deleteMutation.isPending) return;

    deleteMutation.mutate(
      { id: deletingQuestion.id, moduleId, chapterId, topicId },
      { onSuccess: () => setDeletingQuestion(null) }
    );
  };

  const handleRestore = () => {
    if (!restoringQuestion || restoreMutation.isPending) return;

    restoreMutation.mutate(
      { id: restoringQuestion.id, moduleId, chapterId, topicId },
      { onSuccess: () => setRestoringQuestion(null) }
    );
  };

  if (displayQuestions.length === 0 && !showAddControls) {
    return (
      <Alert>
        <AlertDescription>
          No True/False questions available for this section yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Controls */}
      {showAddControls && !showDeleted && (
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => guard(() => setShowBulkModal(true))}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => guard(() => setShowAddModal(true))}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      )}

      {/* Questions */}
      {displayQuestions.length === 0 ? (
        <Alert>
          <AlertDescription>
            {showDeleted 
              ? "No deleted True/False questions." 
              : "No True/False questions yet. Click 'Add Question' to create one."}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {displayQuestions.map((question, index) => (
            <TrueFalseCard
              key={question.id}
              question={question}
              index={index}
              isAdmin={isAdmin}
              chapterId={chapterId || undefined}
              moduleId={moduleId}
              onEdit={isAdmin && !showDeleted ? () => setEditingQuestion(question) : undefined}
              onDelete={isAdmin && !showDeleted ? () => setDeletingQuestion(question) : undefined}
              onRestore={isAdmin && showDeleted ? () => setRestoringQuestion(question) : undefined}
              isDeleted={showDeleted}
              previousAttempt={attemptMap.get(question.id)}
            />
          ))}
        </div>
      )}

      {/* Permission dialog */}
      {dialog}

      {/* Add Modal */}
      <TrueFalseFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        moduleId={moduleId}
        chapterId={chapterId}
        topicId={topicId}
        isAdmin={isAdmin}
      />

      {/* Edit Modal */}
      {editingQuestion && (
        <TrueFalseFormModal
          open={!!editingQuestion}
          onOpenChange={(open) => !open && setEditingQuestion(null)}
          moduleId={moduleId}
          chapterId={chapterId}
          topicId={topicId}
          question={editingQuestion}
          isAdmin={isAdmin}
        />
      )}

      {/* Bulk Upload Modal */}
      <TrueFalseBulkUploadModal
        open={showBulkModal}
        onOpenChange={setShowBulkModal}
        moduleId={moduleId}
        chapterId={chapterId}
        topicId={topicId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the question. It can be restored later from the deleted items view.
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

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoringQuestion} onOpenChange={(open) => !open && setRestoringQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the deleted question and make it visible to students again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
