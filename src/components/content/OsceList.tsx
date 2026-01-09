import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Upload, AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OsceQuestionCard } from './OsceQuestionCard';
import { OsceFormModal } from './OsceFormModal';
import { OsceBulkUploadModal } from './OsceBulkUploadModal';
import { 
  QuestionSearchFilter,
  QuestionSearchFilterState,
  DEFAULT_QUESTION_FILTER,
  filterBySearch,
  sortQuestions,
} from './QuestionSearchFilter';
import { 
  PracticeFilters, 
  PracticeFilterState, 
  DEFAULT_STUDENT_FILTERS,
  filterByStatus,
  countByStatus,
  getActiveFilter,
} from './PracticeFilters';
import { 
  OsceQuestion, 
  useDeleteOsceQuestion, 
  useRestoreOsceQuestion 
} from '@/hooks/useOsceQuestions';
import { isOsceDuplicate } from '@/lib/duplicateDetection';
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

interface OsceListProps {
  questions: OsceQuestion[];
  deletedQuestions?: OsceQuestion[];
  moduleId: string;
  chapterId?: string;
  moduleSlug?: string;
  moduleCode?: string;
  chapterTitle?: string;
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
  moduleSlug,
  moduleCode,
  chapterTitle,
  isAdmin = false,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
}: OsceListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<OsceQuestion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const deleteQuestion = useDeleteOsceQuestion();
  const restoreQuestion = useRestoreOsceQuestion();

  // Question attempt tracking hooks (for students)
  const { data: questionAttempts = [] } = useChapterQuestionAttempts(
    chapterId, 
    'osce'
  );
  const resetAttemptMutation = useResetChapterAttempt();

  // Create a map of question attempts for quick lookup
  const attemptMap = useMemo(() => {
    const map = new Map<string, { is_correct: boolean | null }>();
    questionAttempts.forEach(a => map.set(a.question_id, { is_correct: a.is_correct }));
    return map;
  }, [questionAttempts]);

  // Full attempt map for card display
  const fullAttemptMap = useMemo(() => {
    const map = new Map<string, typeof questionAttempts[0]>();
    questionAttempts.forEach(a => map.set(a.question_id, a));
    return map;
  }, [questionAttempts]);

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

  // Admin search/filter state
  const [searchFilters, setSearchFilters] = useState<QuestionSearchFilterState>(DEFAULT_QUESTION_FILTER);

  // Practice filters - sync with URL (for students)
  const [practiceFilters, setPracticeFilters] = useState<PracticeFilterState>(() => {
    if (isAdmin) return DEFAULT_STUDENT_FILTERS;
    try {
      const param = searchParams.get('osce_filters');
      if (param) {
        return JSON.parse(param);
      }
    } catch {}
    return DEFAULT_STUDENT_FILTERS;
  });

  // Sync filters to URL
  useEffect(() => {
    if (isAdmin) return;
    
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        const activeFilter = getActiveFilter(practiceFilters);
        if (activeFilter === 'all') {
          next.delete('osce_filters');
        } else {
          next.set('osce_filters', JSON.stringify(practiceFilters));
        }
        return next;
      },
      { replace: true }
    );
  }, [practiceFilters, setSearchParams, isAdmin]);

  // Calculate counts for filters
  const filterCounts = useMemo(() => {
    return countByStatus(questions, attemptMap, starredIds);
  }, [questions, attemptMap, starredIds]);

  // Filter questions based on current filters
  const filteredQuestions = useMemo(() => {
    let result = questions;
    
    if (isAdmin) {
      // Apply admin search filters
      result = filterBySearch(result, searchFilters.search, ['history_text', 'statement_1', 'statement_2', 'statement_3', 'statement_4', 'statement_5']);
      
      // Apply duplicates filter
      if (showDuplicatesOnly && !showDeleted) {
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
        result = sortQuestions(result, searchFilters.sortBy);
      }
    } else {
      // Apply student practice filters
      result = filterByStatus(result, practiceFilters, attemptMap, starredIds);
    }
    
    return result;
  }, [questions, practiceFilters, attemptMap, starredIds, isAdmin, searchFilters, showDuplicatesOnly, showDeleted, duplicateIds, duplicateGroupMap]);

  // Display questions (include deleted if toggle is on)
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
    // Also clear starred
    setStarredIds(new Set());
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
        </div>
      )}

      {/* Admin Search and Filter Bar */}
      {isAdmin && questions.length > 0 && (
        <QuestionSearchFilter
          filters={searchFilters}
          onFiltersChange={setSearchFilters}
          totalCount={questions.length}
          filteredCount={displayQuestions.length}
          questionType="OSCE"
          searchPlaceholder="Search OSCE questions..."
          showDifficultyFilter={false}
          adminFilters={{
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
          }}
        />
      )}

      {/* Practice Filters for students (MCQ-style) */}
      {!isAdmin && !showDeleted && chapterId && questions.length > 0 && (
        <PracticeFilters
          filters={practiceFilters}
          onFiltersChange={setPracticeFilters}
          onResetProgress={handleResetProgress}
          counts={filterCounts}
          totalCount={questions.length}
          filteredCount={filteredQuestions.length}
          questionType="osce"
          moduleSlug={moduleSlug}
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

      {/* Questions List */}
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
      ) : (
        <div className="space-y-6">
          {displayQuestions.map((question, index) => {
            const previousAttempt = !isAdmin ? fullAttemptMap.get(question.id) : undefined;
            return (
              <OsceQuestionCard
                key={question.id}
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
