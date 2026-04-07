import { useState, useMemo } from 'react';
import { Plus, Upload, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { AdminViewToggle, type ViewMode } from '@/components/admin/AdminViewToggle';
import { TrueFalseAdminTable } from './TrueFalseAdminTable';
import { BulkSectionAssignment } from '@/components/sections/BulkSectionAssignment';
import { AutoTagSectionsButton } from '@/components/sections';
import { 
  useDeleteTrueFalseQuestion, 
  useRestoreTrueFalseQuestion,
  type TrueFalseQuestion,
} from '@/hooks/useTrueFalseQuestions';
import { useAllChapterQuestionAttempts } from '@/hooks/useQuestionAttempts';
import { useChapterSections, useTopicSections } from '@/hooks/useSections';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import type { Json } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

interface TrueFalseListProps {
  questions: TrueFalseQuestion[];
  deletedQuestions?: TrueFalseQuestion[];
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  isAdmin: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
  onActiveItemChange?: (item: { item_id: string; item_label: string; item_index: number }) => void;
}

export function TrueFalseList({ 
  questions, 
  deletedQuestions = [],
  moduleId, 
  chapterId, 
  topicId,
  isAdmin,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
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
  } = useAddPermissionGuard({ moduleId, chapterId });
  
  // Fetch sections for admin table
  const { data: chapterSections = [] } = useChapterSections(chapterId ?? undefined);
  const { data: topicSections = [] } = useTopicSections(topicId ?? undefined);
  const sections = chapterId ? chapterSections : topicSections;
  
  // UI State
  const [editingQuestion, setEditingQuestion] = useState<TrueFalseQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<TrueFalseQuestion | null>(null);
  const [restoringQuestion, setRestoringQuestion] = useState<TrueFalseQuestion | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Admin controls
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const deleteMutation = useDeleteTrueFalseQuestion();
  const restoreMutation = useRestoreTrueFalseQuestion();
  
  // Question attempt tracking — consolidated single query
  const { data: allAttempts = [] } = useAllChapterQuestionAttempts(chapterId ?? undefined);

  // Create a map of question attempts for quick lookup (true_false uses 'mcq' type in DB)
  const attemptMap = useMemo(() => {
    const map = new Map<string, { is_correct: boolean | null; selected_answer: Json }>();
    allAttempts
      .filter(a => a.question_type === 'mcq')
      .forEach(a => map.set(a.question_id, {
        is_correct: a.is_correct,
        selected_answer: a.selected_answer as Json,
      }));
    return map;
  }, [allAttempts]);

  const displayQuestions = showDeleted ? deletedQuestions : questions;
  
  // Apply filters
  const filteredQuestions = useMemo(() => {
    let result = displayQuestions;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q => 
        q.statement.toLowerCase().includes(query) ||
        (q.explanation?.toLowerCase().includes(query))
      );
    }
    
    // Difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter(q => q.difficulty === difficultyFilter);
    }
    
    return result;
  }, [displayQuestions, searchQuery, difficultyFilter]);
  
  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredQuestions.map(q => q.id));
    } else {
      setSelectedIds([]);
    }
  };
  
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };
  
  const isAllSelected = filteredQuestions.length > 0 && selectedIds.length === filteredQuestions.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredQuestions.length;

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
  
  // Clear selection when bulk assignment completes
  const handleBulkComplete = () => {
    setSelectedIds([]);
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
      {/* Admin Controls Row */}
      {showAddControls && (
        <div className="flex flex-col gap-3">
          {/* Top row: Select all, Bulk actions, View toggle, Add buttons */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              {/* Select All - only in admin mode */}
              {isAdmin && !showDeleted && (
                <div className="flex items-center gap-2 pr-2 border-r">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all"
                    className={cn(isSomeSelected && "data-[state=checked]:bg-primary/50")}
                  />
                  {selectedIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.length} selected
                    </span>
                  )}
                </div>
              )}
              
              {/* Bulk Section Assignment */}
              {chapterId && (
                <BulkSectionAssignment
                  chapterId={chapterId}
                  selectedIds={selectedIds}
                  contentTable="true_false_questions"
                  onComplete={handleBulkComplete}
                />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Deleted Toggle */}
              {showDeletedToggle && onShowDeletedChange && (
                <Button
                  variant={showDeleted ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => onShowDeletedChange(!showDeleted)}
                  className="gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Deleted</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {deletedQuestions.length}
                  </Badge>
                </Button>
              )}
              
              {/* View Toggle */}
              {isAdmin && (
                <AdminViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              )}
              
              {/* Bulk Upload */}
              {!showDeleted && (
                <Button
                  onClick={() => guard(() => setShowBulkModal(true))}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Bulk Import</span>
                </Button>
              )}
              
              {/* Add Question */}
              {!showDeleted && (
                <Button
                  onClick={() => guard(() => setShowAddModal(true))}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Question</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Search and Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search statements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            {/* Difficulty Filter */}
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Count */}
            <span className="text-sm text-muted-foreground">
              {filteredQuestions.length}/{displayQuestions.length}
            </span>
          </div>
        </div>
      )}

      {/* Questions - Table or Cards */}
      {filteredQuestions.length === 0 ? (
        <Alert>
          <AlertDescription>
            {showDeleted 
              ? "No deleted True/False questions." 
              : searchQuery || difficultyFilter !== 'all'
                ? "No questions match your filters."
                : "No True/False questions yet. Click 'Add Question' to create one."}
          </AlertDescription>
        </Alert>
      ) : viewMode === 'table' && isAdmin && !showDeleted ? (
        <TrueFalseAdminTable
          questions={filteredQuestions}
          sections={sections}
          chapterId={chapterId ?? undefined}
          topicId={topicId ?? undefined}
          moduleId={moduleId}
          onEdit={(q) => setEditingQuestion(q)}
          onDelete={(q) => setDeletingQuestion(q)}
        />
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question, index) => (
            <div key={question.id} className="flex gap-2">
              {/* Checkbox for multi-select */}
              {isAdmin && !showDeleted && (
                <div className="pt-4">
                  <Checkbox
                    checked={selectedIds.includes(question.id)}
                    onCheckedChange={(checked) => handleSelectOne(question.id, !!checked)}
                    aria-label={`Select question ${index + 1}`}
                  />
                </div>
              )}
              <div className="flex-1">
                <TrueFalseCard
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
              </div>
            </div>
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
