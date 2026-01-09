import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, CheckCircle2, AlertCircle, AlertTriangle, Copy, Star, Trash2, RotateCcw, Upload, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { McqCard } from './McqCard';
import { McqFormModal } from './McqFormModal';
import { CsvCorrectionPreview } from './CsvCorrectionPreview';
import { 
  PracticeFilters, 
  PracticeFilterState, 
  DEFAULT_STUDENT_FILTERS,
  filterByStatus,
  countByStatus,
} from './PracticeFilters';
import { useDeleteMcq, useRestoreMcq, useBulkCreateMcqs, type Mcq, type McqFormData } from '@/hooks/useMcqs';
import { parseSmartMcqCsv, type ParseCorrection, sanitizeMcq } from '@/lib/csvParser';
import { useMcqContentProcessor } from '@/hooks/useMcqContentProcessor';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { isMcqDuplicate, findDuplicates, type DuplicateResult } from '@/lib/duplicateDetection';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import { 
  useChapterQuestionAttempts, 
  useResetChapterAttempt,
} from '@/hooks/useQuestionAttempts';
import { BulkUploadAnalyzer } from '@/components/admin/BulkUploadAnalyzer';
import { useBulkUploadAnalyzer } from '@/hooks/useBulkUploadAnalyzer';
import { 
  McqSearchFilter, 
  McqSearchFilterState, 
  DEFAULT_SEARCH_FILTER,
  filterMcqsBySearch,
  filterMcqsByDifficulty,
  sortMcqs,
} from './McqSearchFilter';

interface McqListProps {
  mcqs: Mcq[];
  deletedMcqs?: Mcq[];
  moduleId: string;
  chapterId?: string | null;
  isAdmin: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
}

const CSV_TEMPLATE = `stem,choiceA,choiceB,choiceC,choiceD,choiceE,correct_key,explanation,difficulty
"What is the capital of France?",Paris,London,Berlin,Madrid,Rome,A,"Paris is the capital and largest city of France.",easy
"Which organ produces insulin?",Heart,Liver,Pancreas,Kidney,Spleen,C,"The pancreas contains islet cells that produce insulin.",medium`;

const SIMILARITY_THRESHOLD = 0.85;

export function McqList({ 
  mcqs, 
  deletedMcqs = [],
  moduleId, 
  chapterId, 
  isAdmin,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
}: McqListProps) {
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
    isCheckingPermission: permissionLoading,
  } = useAddPermissionGuard({ moduleId, chapterId });
  
  const [editingMcq, setEditingMcq] = useState<Mcq | null>(null);
  const [deletingMcq, setDeletingMcq] = useState<Mcq | null>(null);
  const [restoringMcq, setRestoringMcq] = useState<Mcq | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState<DuplicateResult<McqFormData>[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parseCorrections, setParseCorrections] = useState<ParseCorrection[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filter states from URL params
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(() =>
    searchParams.get('mcq_duplicates') === 'true'
  );
  const [showMarkedOnly, setShowMarkedOnly] = useState(() =>
    searchParams.get('mcq_marked') === 'true'
  );

  // Persist "marked for review" per user + per learning unit (chapter if available, otherwise module)
  const markedStorageKey = useMemo(() => {
    const scopeId = chapterId ?? moduleId;
    const userScope = auth.user?.id ?? 'anon';
    return `mcq-marked-${userScope}-${scopeId}`;
  }, [auth.user?.id, chapterId, moduleId]);

  const [markedIds, setMarkedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem(markedStorageKey);
    if (!stored) return new Set();
    try {
      const parsed = JSON.parse(stored);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist filter states to URL params
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (showDuplicatesOnly) next.set('mcq_duplicates', 'true');
        else next.delete('mcq_duplicates');

        if (showMarkedOnly) next.set('mcq_marked', 'true');
        else next.delete('mcq_marked');

        return next;
      },
      { replace: true }
    );
  }, [showDuplicatesOnly, showMarkedOnly, setSearchParams]);

  // Load marks from storage whenever scope (chapter/module) or user changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(markedStorageKey);
    if (!stored) {
      setMarkedIds(new Set());
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setMarkedIds(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setMarkedIds(new Set());
    }
  }, [markedStorageKey]);

  // Persist marks to storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(markedStorageKey, JSON.stringify(Array.from(markedIds)));
  }, [markedIds, markedStorageKey]);

  const deleteMutation = useDeleteMcq();
  const restoreMutation = useRestoreMcq();
  const bulkCreateMutation = useBulkCreateMcqs();
  
  // AI Analyzer for bulk upload
  const { isAnalyzing, analysis, analyzeFile, clearAnalysis } = useBulkUploadAnalyzer();

  // Search and filter state (for both admin and students)
  const [searchFilters, setSearchFilters] = useState<McqSearchFilterState>(DEFAULT_SEARCH_FILTER);

  // Question attempt tracking hooks (for students)
  const { data: questionAttempts = [] } = useChapterQuestionAttempts(
    chapterId ?? undefined, 
    'mcq'
  );
  const resetAttemptMutation = useResetChapterAttempt();

  // Create a map of question attempts for quick lookup
  // Only need is_correct for the new simplified model
  const attemptMap = useMemo(() => {
    const map = new Map<string, { is_correct: boolean | null; selected_answer: Json }>();
    questionAttempts.forEach(a => map.set(a.question_id, {
      is_correct: a.is_correct,
      selected_answer: a.selected_answer as Json,
    }));
    return map;
  }, [questionAttempts]);

  const totalQuestions = mcqs.length;

  // Student filter state
  const [practiceFilters, setPracticeFilters] = useState<PracticeFilterState>(() => {
    // Load from URL params if available
    const savedFilters = searchParams.get('mcq_filters');
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters);
      } catch {
        return DEFAULT_STUDENT_FILTERS;
      }
    }
    return DEFAULT_STUDENT_FILTERS;
  });

  // Persist filters to URL
  useEffect(() => {
    if (isAdmin) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const isDefault = JSON.stringify(practiceFilters) === JSON.stringify(DEFAULT_STUDENT_FILTERS);
        if (isDefault) {
          next.delete('mcq_filters');
        } else {
          next.set('mcq_filters', JSON.stringify(practiceFilters));
        }
        return next;
      },
      { replace: true }
    );
  }, [practiceFilters, setSearchParams, isAdmin]);

  // Count questions by status using the new simplified model
  const statusCounts = useMemo(() => {
    return countByStatus(mcqs, attemptMap, markedIds);
  }, [mcqs, attemptMap, markedIds]);

  // Combine active and deleted MCQs based on showDeleted flag
  const displayMcqs = showDeleted ? deletedMcqs : mcqs;

  // Find duplicates in existing MCQs and build groupings
  const { duplicateMcqs, duplicateIds, duplicateGroupMap } = useMemo(() => {
    if (!isAdmin) return { 
      duplicateMcqs: [] as { mcq: Mcq; matchedWith: Mcq; similarity: number }[], 
      duplicateIds: new Set<string>(),
      duplicateGroupMap: new Map<string, string>()
    };
    
    const duplicates: { mcq: Mcq; matchedWith: Mcq; similarity: number }[] = [];
    // Map each MCQ id to its "group leader" (the first MCQ in a duplicate group)
    const groupMap = new Map<string, string>();
    
    for (let i = 0; i < mcqs.length; i++) {
      for (let j = i + 1; j < mcqs.length; j++) {
        const result = isMcqDuplicate(mcqs[i], mcqs[j]);
        if (result.isExact || result.similarity >= SIMILARITY_THRESHOLD) {
          duplicates.push({
            mcq: mcqs[j],
            matchedWith: mcqs[i],
            similarity: result.similarity,
          });
          
          // Build group mapping - find the ultimate leader
          const leaderI = groupMap.get(mcqs[i].id) || mcqs[i].id;
          const leaderJ = groupMap.get(mcqs[j].id) || mcqs[j].id;
          
          // If they have different leaders, unify them
          if (leaderI !== leaderJ) {
            // Make leaderI the canonical leader
            groupMap.set(mcqs[j].id, leaderI);
            groupMap.set(leaderJ, leaderI);
          } else {
            groupMap.set(mcqs[j].id, leaderI);
          }
          
          // Ensure the leader points to itself
          if (!groupMap.has(mcqs[i].id)) {
            groupMap.set(mcqs[i].id, mcqs[i].id);
          }
        }
      }
    }
    
    // Get all IDs involved in duplicates (both the duplicate and its match)
    const ids = new Set<string>();
    duplicates.forEach(d => {
      ids.add(d.mcq.id);
      ids.add(d.matchedWith.id);
    });
    
    return { duplicateMcqs: duplicates, duplicateIds: ids, duplicateGroupMap: groupMap };
  }, [mcqs, isAdmin]);

  // Filter based on status filters + admin filters + search/sort
  const filteredMcqs = useMemo(() => {
    let result = displayMcqs;
    
    // For students: use the simplified status-based filtering
    if (!isAdmin && !showDeleted) {
      result = filterByStatus(result, practiceFilters, attemptMap, markedIds);
    }
    
    // Admin filters
    if (showDuplicatesOnly && !showDeleted) {
      result = result.filter(mcq => duplicateIds.has(mcq.id));
    }
    if (showMarkedOnly) {
      result = result.filter(mcq => markedIds.has(mcq.id));
    }
    
    // Apply search filter (for both admin and students)
    result = filterMcqsBySearch(result, searchFilters.search);
    
    // Apply difficulty filter (for both admin and students)
    result = filterMcqsByDifficulty(result, searchFilters.difficulty);
    
    // Apply sorting - but if duplicates filter is on, group by similarity instead
    if (showDuplicatesOnly && duplicateGroupMap.size > 0) {
      // Sort by group leader, then by similarity within group
      result = [...result].sort((a, b) => {
        const leaderA = duplicateGroupMap.get(a.id) || a.id;
        const leaderB = duplicateGroupMap.get(b.id) || b.id;
        
        // Sort by group leader first
        if (leaderA !== leaderB) {
          return leaderA.localeCompare(leaderB);
        }
        
        // Within the same group, put the leader first, then others
        if (a.id === leaderA) return -1;
        if (b.id === leaderA) return 1;
        
        // Otherwise maintain order
        return 0;
      });
    } else {
      result = sortMcqs(result, searchFilters.sortBy);
    }
    
    return result;
  }, [displayMcqs, showDuplicatesOnly, duplicateIds, duplicateGroupMap, showMarkedOnly, markedIds, showDeleted, isAdmin, practiceFilters, attemptMap, searchFilters]);

  const handleResetAttempt = () => {
    if (!chapterId) return;
    resetAttemptMutation.mutate({ chapterId, questionType: 'mcq' });
    // Also reset filters to default so all questions are visible again
    setPracticeFilters(DEFAULT_STUDENT_FILTERS);
  };

  const toggleMark = useCallback((id: string) => {
    setMarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleDelete = () => {
    if (!deletingMcq || deleteMutation.isPending) return;

    deleteMutation.mutate(
      { id: deletingMcq.id, moduleId, chapterId },
      { onSuccess: () => setDeletingMcq(null) }
    );
  };

  const handleRestore = () => {
    if (!restoringMcq || restoreMutation.isPending) return;

    restoreMutation.mutate(
      { id: restoringMcq.id, moduleId, chapterId },
      { onSuccess: () => setRestoringMcq(null) }
    );
  };

  const processWithDuplicateDetection = (parsed: McqFormData[]) => {
    // Compare with existing MCQs
    const existingForComparison = mcqs.map(mcq => ({
      id: mcq.id,
      stem: mcq.stem,
      choices: mcq.choices as { key: string; text: string }[],
    }));

    const results = findDuplicates(
      parsed.map(p => ({ stem: p.stem, choices: p.choices })),
      existingForComparison,
      (a, b) => isMcqDuplicate(a, b),
      SIMILARITY_THRESHOLD
    );

    // Map back to McqFormData with duplicate info
    return results.map((result, index) => ({
      ...result,
      item: parsed[index],
      status: (result.isExactDuplicate ? 'skip' : 'pending') as 'pending' | 'import' | 'skip',
    }));
  };

  const handlePreviewCsv = () => {
    if (!csvText.trim()) return;
    const { mcqs: parsed, corrections } = parseSmartMcqCsv(csvText);
    setParseCorrections(corrections);
    const withDuplicates = processWithDuplicateDetection(parsed);
    setPreviewData(withDuplicates);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileError(null);
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text.trim()) {
          setFileError('The file is empty');
          return;
        }
        
        const { mcqs: parsed, corrections } = parseSmartMcqCsv(text);
        setParseCorrections(corrections);
        
        if (parsed.length === 0) {
          setFileError('No valid MCQs found in the file. Check the format.');
          return;
        }
        
        const withDuplicates = processWithDuplicateDetection(parsed);
        setPreviewData(withDuplicates);
        setCsvText(text);
      } catch (err) {
        setFileError('Failed to parse CSV file');
      }
    };

    reader.onerror = () => {
      setFileError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const resetBulkModal = () => {
    setCsvText('');
    setPreviewData(null);
    setFileName(null);
    setFileError(null);
    setParseCorrections([]);
    clearAnalysis();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to parse CSV line for analysis
  const parseCSVLine = (line: string): string[] => {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    return parts;
  };

  // Handler for AI analysis
  const handleAnalyze = useCallback(() => {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return;
    
    const headers = parseCSVLine(lines[0]);
    const sampleRows = lines.slice(1, 4).map(parseCSVLine);
    
    analyzeFile('mcq', headers, sampleRows);
  }, [csvText, analyzeFile]);

  const toggleItemStatus = (index: number) => {
    if (!previewData) return;
    setPreviewData(prev => prev!.map((item, i) => 
      i === index 
        ? { ...item, status: item.status === 'skip' ? 'import' : 'skip' }
        : item
    ));
  };

  const handleBulkImport = () => {
    if (!previewData) return;
    
    const itemsToImport = previewData
      .filter(item => item.status !== 'skip')
      .map(item => item.item);

    if (itemsToImport.length === 0) {
      return;
    }
    
    bulkCreateMutation.mutate(
      { mcqs: itemsToImport, moduleId, chapterId },
      {
        onSuccess: () => {
          setShowBulkModal(false);
          resetBulkModal();
        },
      }
    );
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcq_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exactDuplicates = previewData?.filter(p => p.isExactDuplicate).length || 0;
  const possibleDuplicates = previewData?.filter(p => p.isPossibleDuplicate).length || 0;
  const itemsToImportCount = previewData?.filter(p => p.status !== 'skip').length || 0;

  if (displayMcqs.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No MCQs available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dialog}
      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Practice Filters for students (not admin, not deleted view) */}
          {!isAdmin && !showDeleted && totalQuestions > 0 && (
            <PracticeFilters
              filters={practiceFilters}
              onFiltersChange={setPracticeFilters}
              onResetProgress={chapterId ? handleResetAttempt : undefined}
              counts={statusCounts}
              totalCount={totalQuestions}
              filteredCount={filteredMcqs.length}
              questionType="MCQ"
            />
          )}
        </div>
        {showAddControls && !showDeleted && (
          <div className="flex gap-2 items-center">
            {/* Permission warning for admins without access */}
            {!permissionLoading && !canManageContent && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <ShieldAlert className="h-3 w-3" />
                    <span>Not your module</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>You can only manage MCQs in modules you've been assigned to. Contact a Platform Admin if you need access.</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="outline"
              onClick={() => guard(() => setShowBulkModal(true))}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button onClick={() => guard(() => setShowAddModal(true))} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter Bar - visible when there are questions */}
      {totalQuestions > 0 && (
        <McqSearchFilter
          filters={searchFilters}
          onFiltersChange={setSearchFilters}
          totalCount={totalQuestions}
          filteredCount={filteredMcqs.length}
          adminFilters={isAdmin ? {
            showMarkedOnly,
            onShowMarkedOnlyChange: setShowMarkedOnly,
            markedCount: markedIds.size,
            showDuplicatesOnly,
            onShowDuplicatesOnlyChange: setShowDuplicatesOnly,
            duplicatesCount: duplicateMcqs.length,
            showDeleted,
            onShowDeletedChange: (checked) => onShowDeletedChange?.(checked),
            deletedCount: deletedMcqs.length,
            showDeletedToggle,
          } : undefined}
        />
      )}

      {/* Deleted Items Alert */}
      {showDeleted && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <Trash2 className="h-4 w-4 text-destructive" />
          <AlertDescription>
            Showing {deletedMcqs.length} deleted question(s). Click "Restore" to recover.
          </AlertDescription>
        </Alert>
      )}


      {/* Duplicate Alert */}
      {isAdmin && showDuplicatesOnly && !showDeleted && duplicateMcqs.length > 0 && (
        <Alert>
          <Copy className="h-4 w-4" />
          <AlertDescription>
            Showing {duplicateMcqs.length} potential duplicate(s). Review and delete as needed.
          </AlertDescription>
        </Alert>
      )}

      {/* MCQ Cards */}
      {filteredMcqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            {showDeleted
              ? 'No deleted questions.'
              : showMarkedOnly 
                ? 'No marked questions. Click the star icon on any question to mark it for review.' 
                : showDuplicatesOnly 
                  ? 'No duplicates found.' 
                  : !isAdmin
                    ? 'No questions match your current filters. Try adjusting your filters.'
                    : 'No MCQs yet. Click "Add Question" to create one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMcqs.map((mcq, index) => {
            const duplicateInfo = !showDeleted ? duplicateMcqs.find(d => d.mcq.id === mcq.id) : null;
            const attemptData = !isAdmin ? attemptMap.get(mcq.id) : undefined;
            const previousAttempt = attemptData ? {
              selected_answer: attemptData.selected_answer,
              is_correct: attemptData.is_correct,
            } : undefined;
            
            return (
              <div key={mcq.id} className={`relative ${showDeleted ? 'opacity-75' : ''}`}>
                {duplicateInfo && (
                  <Badge 
                    variant="outline" 
                    className="absolute -top-2 right-2 z-10 bg-amber-50 text-amber-700 border-amber-300"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {Math.round(duplicateInfo.similarity * 100)}% similar
                  </Badge>
                )}
                {showDeleted && (
                  <Badge 
                    variant="outline" 
                    className="absolute -top-2 right-2 z-10 bg-destructive/10 text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Deleted
                  </Badge>
                )}
                <McqCard
                  mcq={mcq}
                  index={index}
                  isAdmin={isAdmin}
                  chapterId={chapterId ?? undefined}
                  moduleId={moduleId}
                  onEdit={showDeleted ? undefined : () => setEditingMcq(mcq)}
                  onDelete={showDeleted ? undefined : () => setDeletingMcq(mcq)}
                  onRestore={showDeleted ? () => setRestoringMcq(mcq) : undefined}
                  isMarked={markedIds.has(mcq.id)}
                  onToggleMark={toggleMark}
                  isDeleted={showDeleted}
                  previousAttempt={previousAttempt}
                />
              </div>
            );
          })}
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

      {/* Bulk Import Modal with Duplicate Detection */}
      <Dialog open={showBulkModal} onOpenChange={(open) => {
        setShowBulkModal(open);
        if (!open) {
          resetBulkModal();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Import MCQs</DialogTitle>
            <DialogDescription>
              Upload a CSV file or paste CSV content to import multiple MCQs
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            {/* Download template button */}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="gap-1 text-xs">
                <Download className="h-3 w-3" />
                Download Template
              </Button>
            </div>

            {!previewData ? (
              <>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                  <TabsTrigger value="paste">Paste CSV</TabsTrigger>
                  <TabsTrigger value="raw">Paste Raw Text (AI)</TabsTrigger>
                </TabsList>
                
                {/* File Upload Tab */}
                <TabsContent value="upload" className="space-y-4 mt-4">
                  <DragDropZone
                    id="mcq-csv-upload"
                    onFileSelect={(file) => {
                      setFileName(file.name);
                      setFileError(null);
                      setPreviewData(null);
                      setParseCorrections([]);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const text = event.target?.result as string;
                          if (!text.trim()) {
                            setFileError('The file is empty');
                            return;
                          }
                          
                          const { mcqs: parsed, corrections } = parseSmartMcqCsv(text);
                          setParseCorrections(corrections);
                          
                          if (parsed.length === 0) {
                            setFileError('No valid MCQs found in the file. Check the format.');
                            return;
                          }
                          
                          const withDuplicates = processWithDuplicateDetection(parsed);
                          setPreviewData(withDuplicates);
                          setCsvText(text);
                        } catch (err) {
                          setFileError('Failed to parse CSV file');
                        }
                      };
                      reader.onerror = () => {
                        setFileError('Failed to read file');
                      };
                      reader.readAsText(file);
                    }}
                    fileName={fileName || undefined}
                    accept=".csv"
                    acceptedTypes={['.csv']}
                    maxSizeMB={10}
                  />

                  {fileError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Paste CSV Tab */}
                <TabsContent value="paste" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Paste CSV content here</Label>
                    <Textarea
                      value={csvText}
                      onChange={(e) => {
                        setCsvText(e.target.value);
                        setPreviewData(null);
                        setFileName(null);
                        setFileError(null);
                      }}
                      rows={8}
                      placeholder="stem,choiceA,choiceB,choiceC,choiceD,choiceE,correct_key,explanation,difficulty"
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <Button 
                    onClick={handlePreviewCsv} 
                    variant="secondary" 
                    className="w-full"
                    disabled={!csvText.trim()}
                  >
                  Preview Import
                  </Button>
                </TabsContent>

                {/* Raw Text AI Parsing Tab */}
                <TabsContent value="raw" className="space-y-4 mt-4">
                  <Alert className="border-primary/30 bg-primary/5">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      Paste unformatted text from PDFs or documents. AI will extract MCQs automatically.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label>Paste raw question text</Label>
                    <Textarea
                      value={csvText}
                      onChange={(e) => {
                        setCsvText(e.target.value);
                        setPreviewData(null);
                        setFileName(null);
                        setFileError(null);
                      }}
                      rows={10}
                      placeholder={`Paste your questions here, e.g.:

1. What is the capital of France?
a) London
b) Paris
c) Berlin
d) Madrid
e) Rome
Answer: B

The AI will parse and extract the questions automatically.`}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      if (!csvText.trim()) return;
                      setFileError(null);
                      // Try AI parsing via edge function
                      const { data, error } = await supabase.functions.invoke('process-mcq-content', {
                        body: { action: 'parse', rawText: csvText }
                      });
                      if (error || data?.error) {
                        setFileError(data?.error || error?.message || 'AI parsing failed');
                        return;
                      }
                      if (!data.mcqs || data.mcqs.length === 0) {
                        setFileError('No MCQs could be extracted from the text');
                        return;
                      }
                      const withDuplicates = processWithDuplicateDetection(data.mcqs);
                      setPreviewData(withDuplicates);
                      setParseCorrections([{ type: 'column_mapped', message: `AI extracted ${data.mcqs.length} questions from raw text` }]);
                    }}
                    variant="secondary" 
                    className="w-full gap-2"
                    disabled={!csvText.trim()}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Parse with AI
                  </Button>

                  {fileError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                </Tabs>
              
                {/* AI Analyzer - show when file is loaded but not yet previewed */}
                {(csvText.trim() || fileName) && (
                  <BulkUploadAnalyzer
                    isAnalyzing={isAnalyzing}
                    analysis={analysis}
                    onAnalyze={handleAnalyze}
                    disabled={!csvText.trim() && !fileName}
                  />
                )}
              </>
            ) : (
              /* Preview Section with Duplicate Detection */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <Label>{previewData.length} questions parsed</Label>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetBulkModal}>
                    Start Over
                  </Button>
                </div>

                {/* Auto-corrections applied preview */}
                {parseCorrections.length > 0 && (
                  <CsvCorrectionPreview corrections={parseCorrections} />
                )}

                {/* Duplicate Summary */}
                {(exactDuplicates > 0 || possibleDuplicates > 0) && (
                  <Alert className="border-amber-500/50 bg-amber-50/50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Duplicate Detection:</strong>
                      {exactDuplicates > 0 && (
                        <span className="ml-2">
                          {exactDuplicates} exact duplicate(s) found (auto-skipped)
                        </span>
                      )}
                      {possibleDuplicates > 0 && (
                        <span className="ml-2">
                          {possibleDuplicates} possible duplicate(s) detected
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                <ScrollArea className="h-64 border rounded-md">
                  <div className="p-3 space-y-2">
                    {previewData.map((item, i) => (
                      <div 
                        key={i} 
                        className={`text-sm p-3 rounded border ${
                          item.isExactDuplicate 
                            ? 'bg-red-50 border-red-200' 
                            : item.isPossibleDuplicate 
                              ? 'bg-amber-50 border-amber-200' 
                              : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.status !== 'skip'}
                            onCheckedChange={() => toggleItemStatus(i)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{i + 1}. {item.item.stem}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Answer: {item.item.correct_key} | Difficulty: {item.item.difficulty || 'not set'}
                            </p>
                            {item.isExactDuplicate && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                <Copy className="h-3 w-3 mr-1" />
                                Exact duplicate - will skip
                              </Badge>
                            )}
                            {item.isPossibleDuplicate && !item.isExactDuplicate && (
                              <Badge variant="outline" className="mt-1 text-xs bg-amber-100 text-amber-800 border-amber-300">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {Math.round(item.similarity * 100)}% similar - review
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button 
                  onClick={handleBulkImport} 
                  className="w-full"
                  disabled={bulkCreateMutation.isPending || itemsToImportCount === 0}
                >
                  {bulkCreateMutation.isPending 
                    ? 'Importing...' 
                    : `Import ${itemsToImportCount} Question${itemsToImportCount !== 1 ? 's' : ''}`
                  }
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Format: stem, choiceA, choiceB, choiceC, choiceD, choiceE, correct_key (A-E), explanation, difficulty (easy/medium/hard)
              <br />
              Use quotes around values containing commas.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingMcq}
        onOpenChange={(open) => {
          // Don't allow the dialog to close while the delete mutation is running.
          if (!open && !deleteMutation.isPending) setDeletingMcq(null);
        }}
      >
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MCQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will 
              <span className="font-medium text-foreground"> soft-delete </span>
              the question (set <code>is_deleted=true</code>). You can restore it later.
              <br />
              <span className="font-medium mt-2 block text-foreground">
                "{deletingMcq?.stem.slice(0, 100)}..."
              </span>
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
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoringMcq}
        onOpenChange={(open) => {
          if (!open && !restoreMutation.isPending) setRestoringMcq(null);
        }}
      >
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore MCQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the question and make it visible to students again.
              <br />
              <span className="font-medium mt-2 block text-foreground">
                "{restoringMcq?.stem.slice(0, 100)}..."
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRestore();
              }}
              disabled={restoreMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
