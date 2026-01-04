import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Upload, AlertCircle } from 'lucide-react';
import { OsceQuestionCard } from './OsceQuestionCard';
import { OsceFormModal } from './OsceFormModal';
import { OsceBulkUploadModal } from './OsceBulkUploadModal';
import { 
  OsceQuestion, 
  useDeleteOsceQuestion, 
  useRestoreOsceQuestion 
} from '@/hooks/useOsceQuestions';
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

interface OsceListProps {
  questions: OsceQuestion[];
  deletedQuestions?: OsceQuestion[];
  moduleId: string;
  chapterId?: string;
  isAdmin?: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
}

export function OsceList({
  questions,
  deletedQuestions = [],
  moduleId,
  chapterId,
  isAdmin = false,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
}: OsceListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<OsceQuestion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const deleteQuestion = useDeleteOsceQuestion();
  const restoreQuestion = useRestoreOsceQuestion();

  const displayQuestions = showDeleted 
    ? [...questions, ...deletedQuestions]
    : questions;

  const handleEdit = (question: OsceQuestion) => {
    setEditingQuestion(question);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteQuestion.mutateAsync({ 
      id: deleteConfirmId, 
      chapterId, 
      moduleId 
    });
    setDeleteConfirmId(null);
  };

  const handleRestore = async (question: OsceQuestion) => {
    await restoreQuestion.mutateAsync({ 
      id: question.id, 
      chapterId, 
      moduleId 
    });
  };

  if (displayQuestions.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No OSCE questions available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Controls */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              setEditingQuestion(null);
              setFormOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-1" />
              Add OSCE Question
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-1" />
              Bulk Upload
            </Button>
          </div>

          {showDeletedToggle && deletedQuestions.length > 0 && (
            <div className="flex items-center gap-2">
              <Switch
                id="show-deleted-osce"
                checked={showDeleted}
                onCheckedChange={onShowDeletedChange}
              />
              <Label htmlFor="show-deleted-osce" className="text-sm">
                Show deleted ({deletedQuestions.length})
              </Label>
            </div>
          )}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {displayQuestions.map((question, index) => (
          <OsceQuestionCard
            key={question.id}
            question={question}
            questionNumber={index + 1}
            isAdmin={isAdmin}
            onEdit={() => handleEdit(question)}
            onDelete={() => setDeleteConfirmId(question.id)}
            onRestore={() => handleRestore(question)}
          />
        ))}
      </div>

      {displayQuestions.length === 0 && isAdmin && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No OSCE questions yet. Add your first question.</p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add OSCE Question
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <OsceFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingQuestion(null);
        }}
        moduleId={moduleId}
        chapterId={chapterId}
        editingQuestion={editingQuestion}
      />

      {/* Bulk Upload Modal */}
      <OsceBulkUploadModal
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        moduleId={moduleId}
        chapterId={chapterId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OSCE Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the question. You can restore it later from the deleted items view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default OsceList;
