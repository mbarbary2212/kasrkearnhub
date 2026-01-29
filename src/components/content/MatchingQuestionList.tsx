import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Upload, Link2, Trash2, RotateCcw } from 'lucide-react';
import { MatchingQuestionCard } from './MatchingQuestionCard';
import { MatchingQuestionFormModal } from './MatchingQuestionFormModal';
import { MatchingQuestionBulkUploadModal } from './MatchingQuestionBulkUploadModal';
import { MatchingAdminTable } from './MatchingAdminTable';
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { 
  UnifiedQuestionFilter,
  UnifiedFilterState,
  DEFAULT_UNIFIED_FILTER,
  filterBySearch,
  filterByDifficulty,
  filterByStatus,
  sortItems,
  countByStatus,
} from './UnifiedQuestionFilter';
import { useDeleteMatchingQuestion, useRestoreMatchingQuestion, type MatchingQuestion } from '@/hooks/useMatchingQuestions';
import { isMatchingDuplicate } from '@/lib/duplicateDetection';
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
import { 
  useChapterQuestionAttempts, 
  useResetChapterAttempt,
} from '@/hooks/useQuestionAttempts';

const SIMILARITY_THRESHOLD = 0.85;

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
  
  // Unified filter state
  const [filters, setFilters] = useState<UnifiedFilterState>(DEFAULT_UNIFIED_FILTER);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('cards');

  const deleteMutation = useDeleteMatchingQuestion();
  const restoreMutation = useRestoreMatchingQuestion();

  // Question attempt tracking hooks (for students)
  const { data: questionAttempts = [] } = useChapterQuestionAttempts(
    chapterId ?? undefined, 
    'mcq' // Matching uses 'mcq' type in DB
  );
  const resetAttemptMutation = useResetChapterAttempt();

  // Create a map of question attempts for quick lookup
  const attemptMap = useMemo(() => {
    const map = new Map<string, { is_correct: boolean | null }>();
    questionAttempts.forEach(a => map.set(a.question_id, { is_correct: a.is_correct }));
    return map;
  }, [questionAttempts]);

  // Starred questions - stored in localStorage
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(`matching_starred_${chapterId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist starred to localStorage
  useEffect(() => {
    if (chapterId) {
      localStorage.setItem(`matching_starred_${chapterId}`, JSON.stringify([...starredIds]));
    }
  }, [starredIds, chapterId]);

  const toggleStar = useCallback((id: string) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Calculate counts for status filters
  const statusCounts = useMemo(() => {
    return countByStatus(questions, attemptMap, starredIds);
  }, [questions, attemptMap, starredIds]);

  // Duplicate detection for matching questions
  const { duplicateIds, duplicateGroupMap } = useMemo(() => {
    if (!isAdmin) return { 
      duplicateIds: new Set<string>(),
      duplicateGroupMap: new Map<string, string>()
    };
    
    const duplicates: { question: MatchingQuestion; matchedWith: MatchingQuestion; similarity: number }[] = [];
    const groupMap = new Map<string, string>();
    
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const result = isMatchingDuplicate(questions[i], questions[j]);
        if (result.isExact || result.similarity >= SIMILARITY_THRESHOLD) {
          duplicates.push({
            question: questions[j],
            matchedWith: questions[i],
            similarity: result.similarity,
          });
          
          const leaderI = groupMap.get(questions[i].id) || questions[i].id;
          const leaderJ = groupMap.get(questions[j].id) || questions[j].id;
          
          if (leaderI !== leaderJ) {
            groupMap.set(questions[j].id, leaderI);
            groupMap.set(leaderJ, leaderI);
          } else {
            groupMap.set(questions[j].id, leaderI);
          }
          
          if (!groupMap.has(questions[i].id)) {
            groupMap.set(questions[i].id, questions[i].id);
          }
        }
      }
    }
    
    const ids = new Set<string>();
    duplicates.forEach(d => {
      ids.add(d.question.id);
      ids.add(d.matchedWith.id);
    });
    
    return { duplicateIds: ids, duplicateGroupMap: groupMap };
  }, [questions, isAdmin]);

  // Filter and sort questions
  const filteredQuestions = useMemo(() => {
    let result = questions;
    
    // Apply search filter
    result = filterBySearch(result, filters.search, ['instruction'] as (keyof MatchingQuestion)[]);
    
    // Apply difficulty filter
    result = filterByDifficulty(result, filters.difficulty);
    
    // Apply status filter (for students)
    if (!isAdmin && filters.status !== 'all') {
      result = filterByStatus(result, filters.status, attemptMap, starredIds);
    }
    
    // Apply duplicates filter (admin only)
    if (isAdmin && showDuplicatesOnly && !showDeleted) {
      result = result.filter(q => duplicateIds.has(q.id));
    }
    
    // Sort - group duplicates together if showing duplicates only
    if (showDuplicatesOnly && duplicateGroupMap.size > 0) {
      result = [...result].sort((a, b) => {
        const leaderA = duplicateGroupMap.get(a.id) || a.id;
        const leaderB = duplicateGroupMap.get(b.id) || b.id;
        
        if (leaderA !== leaderB) {
          return leaderA.localeCompare(leaderB);
        }
        
        if (a.id === leaderA) return -1;
        if (b.id === leaderA) return 1;
        
        return 0;
      });
    } else {
      result = sortItems(result, filters.sortBy);
    }
    
    return result;
  }, [questions, filters, attemptMap, starredIds, isAdmin, showDuplicatesOnly, showDeleted, duplicateIds, duplicateGroupMap]);

  const handleResetProgress = () => {
    if (!chapterId) return;
    resetAttemptMutation.mutate({ chapterId, questionType: 'mcq' }); // Matching uses 'mcq' type
    setStarredIds(new Set());
    setFilters(prev => ({ ...prev, status: 'all' }));
  };

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
    await restoreMutation.mutateAsync({
      id: question.id,
      moduleId,
      chapterId,
    });
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Combine active and deleted questions when showing deleted
  const displayQuestions = showDeleted ? [...deletedQuestions] : filteredQuestions;

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
      {showAddControls && (
        <div className="flex gap-2 mb-4 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap">
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
          </div>
          {isAdmin && (
            <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
          )}
        </div>
      )}

      {/* Unified Search and Filter Bar */}
      {questions.length > 0 && (
        <UnifiedQuestionFilter
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={questions.length}
          filteredCount={displayQuestions.length}
          questionType="Matching"
          searchPlaceholder="Search matching questions..."
          showDifficultyFilter={true}
          showStatusFilter={!isAdmin && !!chapterId}
          statusCounts={statusCounts}
          onResetProgress={chapterId ? handleResetProgress : undefined}
          adminFilters={isAdmin ? {
            showMarkedOnly: false,
            onShowMarkedOnlyChange: () => {},
            markedCount: starredIds.size,
            showDuplicatesOnly,
            onShowDuplicatesOnlyChange: setShowDuplicatesOnly,
            duplicatesCount: duplicateIds.size,
            showDeleted,
            onShowDeletedChange: (checked) => onShowDeletedChange?.(checked),
            deletedCount: deletedQuestions.length,
            showDeletedToggle: showDeletedToggle ?? false,
          } : undefined}
        />
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
      {isAdmin && adminViewMode === 'table' ? (
        <MatchingAdminTable
          questions={displayQuestions.filter(q => !q.is_deleted)}
          chapterId={chapterId}
          topicId={topicId}
          moduleId={moduleId}
          onEdit={handleEdit}
          onDelete={(q) => setDeleteId(q.id)}
        />
      ) : (
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
                    chapterId={chapterId || undefined}
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
      )}

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
