import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Link2, Filter, Trash2, RotateCcw } from 'lucide-react';
import { MatchingQuestionCard } from './MatchingQuestionCard';
import { MatchingQuestionFormModal } from './MatchingQuestionFormModal';
import { MatchingQuestionBulkUploadModal } from './MatchingQuestionBulkUploadModal';
import { useDeleteMatchingQuestion, useRestoreMatchingQuestion, type MatchingQuestion } from '@/hooks/useMatchingQuestions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button onClick={() => { setEditingQuestion(null); setShowAddModal(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Bulk Import
          </Button>
          {showDeletedToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {showDeleted && (
                    <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={showDeleted}
                  onCheckedChange={(checked) => onShowDeletedChange?.(!!checked)}
                >
                  <Trash2 className="h-3 w-3 mr-2 text-destructive" />
                  Show deleted ({deletedQuestions.length})
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Empty state for admin */}
      {displayQuestions.length === 0 && isAdmin && (
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
