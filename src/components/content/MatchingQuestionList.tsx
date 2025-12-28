import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Link2 } from 'lucide-react';
import { MatchingQuestionCard } from './MatchingQuestionCard';
import { MatchingQuestionFormModal } from './MatchingQuestionFormModal';
import { MatchingQuestionBulkUploadModal } from './MatchingQuestionBulkUploadModal';
import { useDeleteMatchingQuestion, type MatchingQuestion } from '@/hooks/useMatchingQuestions';
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
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  isAdmin: boolean;
}

export function MatchingQuestionList({
  questions,
  moduleId,
  chapterId,
  topicId,
  isAdmin,
}: MatchingQuestionListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MatchingQuestion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deleteMutation = useDeleteMatchingQuestion();

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

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // For students: show nothing if no questions
  if (questions.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No matching questions available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin controls */}
      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <Button onClick={() => { setEditingQuestion(null); setShowAddModal(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Bulk Import
          </Button>
        </div>
      )}

      {/* Empty state for admin */}
      {questions.length === 0 && isAdmin && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No matching questions yet</p>
          <Button onClick={() => { setEditingQuestion(null); setShowAddModal(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add First Question
          </Button>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <MatchingQuestionCard
            key={question.id}
            question={question}
            index={index}
            isAdmin={isAdmin}
            onEdit={() => handleEdit(question)}
            onDelete={() => setDeleteId(question.id)}
            isExpanded={expandedId === question.id}
            onToggleExpand={handleToggleExpand}
          />
        ))}
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
