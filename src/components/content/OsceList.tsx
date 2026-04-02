import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Upload, AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { OsceQuestionCard } from './OsceQuestionCard';
import { OsceFormModal } from './OsceFormModal';
import { OsceBulkUploadModal } from './OsceBulkUploadModal';
import { OsceAdminTable } from './OsceAdminTable';
import { AdminViewToggle, type ViewMode } from '@/components/admin/AdminViewToggle';
import { BulkSectionAssignment } from '@/components/sections/BulkSectionAssignment';
import { 
  UnifiedQuestionFilter,
  UnifiedFilterState,
  DEFAULT_UNIFIED_FILTER,
  filterBySearch,
  filterByStatus,
  sortItems,
  countByStatus,
} from './UnifiedQuestionFilter';
import { 
  OsceQuestion, 
  useDeleteOsceQuestion, 
  useRestoreOsceQuestion 
} from '@/hooks/useOsceQuestions';
import { isOsceDuplicate } from '@/lib/duplicateDetection';
import { useChapterSections, useTopicSections } from '@/hooks/useSections';
import { QuestionSessionShell } from '@/components/question-session/QuestionSessionShell';
import { ContentItemAdminBar } from '@/components/admin/ContentItemAdminBar';
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
  useAllChapterQuestionAttempts, 
  useResetChapterAttempt,
} from '@/hooks/useQuestionAttempts';

const SIMILARITY_THRESHOLD = 0.85;

interface OsceListProps {
  questions: OsceQuestion[];
  deletedQuestions?: OsceQuestion[];
  moduleId: string;
  chapterId?: string;
  topicId?: string;
  moduleSlug?: string;
  moduleCode?: string;
  chapterTitle?: string;
  isAdmin?: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
  onActiveItemChange?: (info: { item_id: string; item_label: string; item_index: number }) => void;
}

export function OsceList({
  questions,
  deletedQuestions = [],
  moduleId,
  chapterId,
  topicId,
  moduleSlug,
  moduleCode,
  chapterTitle,
  isAdmin = false,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
  onActiveItemChange,
}: OsceListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<OsceQuestion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Single-open-at-a-time feedback panel
  const [feedbackOpenId, setFeedbackOpenId] = useState<string | null>(null);
  
  // Admin view toggle
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  // Fetch sections for admin table
  const { data: chapterSections = [] } = useChapterSections(chapterId);
  const { data: topicSections = [] } = useTopicSections(topicId);
  const sections = chapterId ? chapterSections : topicSections;
  
  // Multi-select state for bulk section assignment
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteQuestion = useDeleteOsceQuestion();
  const restoreQuestion = useRestoreOsceQuestion();

  // Question attempt tracking hooks (for students) — consolidated single query
  const { data: allAttempts = [] } = useAllChapterQuestionAttempts(chapterId);
  const resetAttemptMutation = useResetChapterAttempt();

  // Filter to osce type
  const osceAttempts = useMemo(() => 
    allAttempts.filter(a => a.question_type === 'osce'),
    [allAttempts]
  );

  // Create a map of question attempts for quick lookup
  const attemptMap = useMemo(() => {
    const map = new Map<string, { is_correct: boolean | null }>();
    osceAttempts.forEach(a => map.set(a.question_id, { is_correct: a.is_correct }));
    return map;
  }, [osceAttempts]);

  // Full attempt map for card display
  const fullAttemptMap = useMemo(() => {
    const map = new Map<string, typeof osceAttempts[0]>();
    osceAttempts.forEach(a => map.set(a.question_id, a));
    return map;
  }, [osceAttempts]);

  // Starred questions - stored in localStorage
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(`osce_starred_${chapterId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist starred to localStorage
  useEffect(() => {
    if (chapterId) {
      localStorage.setItem(`osce_starred_${chapterId}`, JSON.stringify([...starredIds]));
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

  // Duplicate detection for OSCE questions
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  
  const { duplicateIds, duplicateGroupMap } = useMemo(() => {
    if (!isAdmin) return { 
      duplicateIds: new Set<string>(),
      duplicateGroupMap: new Map<string, string>()
    };
    
    const duplicates: { question: OsceQuestion; matchedWith: OsceQuestion; similarity: number }[] = [];
    const groupMap = new Map<string, string>();
    
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const result = isOsceDuplicate(questions[i], questions[j]);
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

  // Unified filter state
  const [filters, setFilters] = useState<UnifiedFilterState>(DEFAULT_UNIFIED_FILTER);

  // Calculate counts for status filters
  const statusCounts = useMemo(() => {
    return countByStatus(questions, attemptMap, starredIds);
  }, [questions, attemptMap, starredIds]);

  // Filter questions based on current filters
  const filteredQuestions = useMemo(() => {
    let result = questions;
    
    // Apply search filter
    result = filterBySearch(result, filters.search, ['history_text', 'statement_1', 'statement_2', 'statement_3', 'statement_4', 'statement_5'] as (keyof OsceQuestion)[]);
    
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

  // selectAll defined after filteredQuestions is available
  const selectAll = useCallback(() => {
    const allIds = filteredQuestions.map(q => q.id);
    setSelectedIds(new Set(allIds));
  }, [filteredQuestions]);

  const displayQuestions = useMemo(() => {
    if (showDeleted) {
      return [...deletedQuestions];
    }
    return filteredQuestions;
  }, [filteredQuestions, deletedQuestions, showDeleted]);

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

  const handleResetProgress = () => {
    if (!chapterId) return;
    resetAttemptMutation.mutate({ chapterId, questionType: 'osce' });
    // Also clear starred and reset filter status
    setStarredIds(new Set());
    setFilters(prev => ({ ...prev, status: 'all' }));
  };

  if (questions.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No OSCE questions available yet.</p>
      </div>
    );
  }

  // Student session view — split-screen layout
  if (!isAdmin && filteredQuestions.length > 0 && chapterId) {
    // Build attempt map compatible with QuestionSessionShell
    const osceAttemptMapForShell = new Map<string, { is_correct: boolean | null; selected_answer?: any }>();
    fullAttemptMap.forEach((attempt, id) => {
      osceAttemptMapForShell.set(id, {
        is_correct: attempt.is_correct,
        selected_answer: attempt.selected_answer,
      });
    });

    return (
      <div className="space-y-4">
        {/* Filter bar */}
        {questions.length > 0 && (
          <UnifiedQuestionFilter
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={questions.length}
            filteredCount={filteredQuestions.length}
            questionType="OSCE"
            searchPlaceholder="Search OSCE questions..."
            showDifficultyFilter={false}
            showStatusFilter={!!chapterId}
            statusCounts={statusCounts}
            onResetProgress={handleResetProgress}
          />
        )}
        <QuestionSessionShell
          questions={filteredQuestions}
          questionType="osce"
          moduleId={moduleId}
          chapterId={chapterId}
          attemptMap={osceAttemptMapForShell}
          allAttempts={osceAttempts}
          onActiveItemChange={onActiveItemChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Controls */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex gap-2 items-center flex-wrap">
            {/* Multi-select controls for bulk section assignment */}
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedIds.size > 0 && selectedIds.size === filteredQuestions.length}
                onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
                aria-label="Select all"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
              {selectedIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
                  Clear
                </Button>
              )}
            </div>
            
            <BulkSectionAssignment
              chapterId={chapterId}
              topicId={topicId}
              selectedIds={Array.from(selectedIds)}
              contentTable="osce_questions"
              onComplete={clearSelection}
            />
            
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
          
          {/* View Toggle */}
          <AdminViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      )}

      {/* Unified Search and Filter Bar */}
      {questions.length > 0 && (
        <UnifiedQuestionFilter
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={questions.length}
          filteredCount={displayQuestions.length}
          questionType="OSCE"
          searchPlaceholder="Search OSCE questions..."
          showDifficultyFilter={false}
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
            showDeletedToggle,
          } : undefined}
        />
      )}

      {/* Deleted Alert */}
      {showDeleted && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <Trash2 className="h-4 w-4 text-destructive" />
          <AlertDescription>
            Showing {deletedQuestions.length} deleted question(s). Click "Restore" to recover.
          </AlertDescription>
        </Alert>
      )}

      {/* Questions List - Table or Cards */}
      {displayQuestions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            {showDeleted
              ? 'No deleted questions.'
              : !isAdmin && filteredQuestions.length === 0 && questions.length > 0
                ? 'No questions match your filter. Try changing the filter or reset your progress.'
                : isAdmin
                  ? 'No OSCE questions yet. Add your first question.'
                  : 'No OSCE questions available yet.'}
          </p>
        </div>
      ) : viewMode === 'table' && isAdmin && !showDeleted ? (
        <OsceAdminTable
          questions={displayQuestions}
          sections={sections}
          chapterId={chapterId}
          topicId={topicId}
          moduleId={moduleId}
          onEdit={handleEdit}
          onDelete={(q) => setDeleteConfirmId(q.id)}
        />
      ) : (
        <div className="space-y-6">
          {displayQuestions.map((question, index) => {
            const previousAttempt = !isAdmin ? fullAttemptMap.get(question.id) : undefined;
            return (
              <div key={question.id} data-content-id={question.id} className="flex gap-2">
                {/* Admin multi-select checkbox */}
                {isAdmin && !showDeleted && (
                  <div className="pt-4 flex-shrink-0">
                    <Checkbox 
                      checked={selectedIds.has(question.id)}
                      onCheckedChange={(checked) => toggleSelection(question.id, !!checked)}
                      aria-label={`Select question ${index + 1}`}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <OsceQuestionCard
                    question={question}
                    questionNumber={index + 1}
                    isAdmin={isAdmin}
                    chapterId={chapterId}
                    moduleId={moduleId}
                    onEdit={() => handleEdit(question)}
                    onDelete={() => setDeleteConfirmId(question.id)}
                    onRestore={() => handleRestore(question)}
                    previousAttempt={previousAttempt}
                    isStarred={starredIds.has(question.id)}
                    onToggleStar={toggleStar}
                  />
                  {isAdmin && !showDeleted && (
                    <ContentItemAdminBar
                      materialType="osce"
                      materialId={question.id}
                      chapterId={chapterId}
                      onEdit={() => handleEdit(question)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && questions.length === 0 && displayQuestions.length === 0 && (
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
        moduleCode={moduleCode}
        chapterTitle={chapterTitle}
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
