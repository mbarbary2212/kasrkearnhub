import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, CheckCircle2, AlertCircle, AlertTriangle, Copy, Filter, Star, Trash2, RotateCcw, Upload, ShieldAlert } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { McqCard } from './McqCard';
import { McqFormModal } from './McqFormModal';
import { useDeleteMcq, useRestoreMcq, useBulkCreateMcqs, parseMcqCsv, type Mcq, type McqFormData } from '@/hooks/useMcqs';
import { isMcqDuplicate, findDuplicates, type DuplicateResult } from '@/lib/duplicateDetection';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';

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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filter states from URL params
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(() => 
    searchParams.get('mcq_duplicates') === 'true'
  );
  const [showMarkedOnly, setShowMarkedOnly] = useState(() => 
    searchParams.get('mcq_marked') === 'true'
  );
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [expandedMcqId, setExpandedMcqId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist filter states to URL params
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (showDuplicatesOnly) {
      newParams.set('mcq_duplicates', 'true');
    } else {
      newParams.delete('mcq_duplicates');
    }
    if (showMarkedOnly) {
      newParams.set('mcq_marked', 'true');
    } else {
      newParams.delete('mcq_marked');
    }
    setSearchParams(newParams, { replace: true });
  }, [showDuplicatesOnly, showMarkedOnly, setSearchParams]);

  const deleteMutation = useDeleteMcq();
  const restoreMutation = useRestoreMcq();
  const bulkCreateMutation = useBulkCreateMcqs();

  // Combine active and deleted MCQs based on showDeleted flag
  const displayMcqs = showDeleted ? deletedMcqs : mcqs;

  // Find duplicates in existing MCQs
  const duplicateMcqs = useMemo(() => {
    if (!isAdmin) return [];
    
    const duplicates: { mcq: Mcq; matchedWith: Mcq; similarity: number }[] = [];
    
    for (let i = 0; i < mcqs.length; i++) {
      for (let j = i + 1; j < mcqs.length; j++) {
        const result = isMcqDuplicate(mcqs[i], mcqs[j]);
        if (result.isExact || result.similarity >= SIMILARITY_THRESHOLD) {
          duplicates.push({
            mcq: mcqs[j],
            matchedWith: mcqs[i],
            similarity: result.similarity,
          });
        }
      }
    }
    
    return duplicates;
  }, [mcqs, isAdmin]);

  const duplicateIds = useMemo(() => 
    new Set(duplicateMcqs.map(d => d.mcq.id)),
    [duplicateMcqs]
  );

  const filteredMcqs = useMemo(() => {
    let result = displayMcqs;
    if (showDuplicatesOnly && !showDeleted) {
      result = result.filter(mcq => duplicateIds.has(mcq.id));
    }
    if (showMarkedOnly) {
      result = result.filter(mcq => markedIds.has(mcq.id));
    }
    return result;
  }, [displayMcqs, showDuplicatesOnly, duplicateIds, showMarkedOnly, markedIds, showDeleted]);

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
    const parsed = parseMcqCsv(csvText);
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
        
        const parsed = parseMcqCsv(text);
        
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
  const itemsToImport = previewData?.filter(p => p.status !== 'skip').length || 0;

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
          {/* Filters dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-3 w-3" />
                Filters
                {(showDuplicatesOnly || showMarkedOnly || showDeleted) && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {(showDuplicatesOnly ? 1 : 0) + (showMarkedOnly ? 1 : 0) + (showDeleted ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={showMarkedOnly}
                onCheckedChange={setShowMarkedOnly}
              >
                <Star className="h-3 w-3 mr-2 text-amber-500" />
                Marked for review ({markedIds.size})
              </DropdownMenuCheckboxItem>
              {isAdmin && duplicateMcqs.length > 0 && !showDeleted && (
                <DropdownMenuCheckboxItem
                  checked={showDuplicatesOnly}
                  onCheckedChange={setShowDuplicatesOnly}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Show duplicates only ({duplicateMcqs.length})
                </DropdownMenuCheckboxItem>
              )}
              {isAdmin && showDeletedToggle && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={showDeleted}
                    onCheckedChange={(checked) => onShowDeletedChange?.(!!checked)}
                  >
                    <Trash2 className="h-3 w-3 mr-2 text-destructive" />
                    Show deleted ({deletedMcqs.length})
                  </DropdownMenuCheckboxItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                  : isAdmin 
                    ? 'No MCQs yet. Click "Add Question" to create one.'
                    : 'No MCQs available yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMcqs.map((mcq, index) => {
            const duplicateInfo = !showDeleted ? duplicateMcqs.find(d => d.mcq.id === mcq.id) : null;
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
                  chapterId={chapterId}
                  onEdit={showDeleted ? undefined : () => setEditingMcq(mcq)}
                  onDelete={showDeleted ? undefined : () => setDeletingMcq(mcq)}
                  onRestore={showDeleted ? () => setRestoringMcq(mcq) : undefined}
                  isMarked={markedIds.has(mcq.id)}
                  onToggleMark={toggleMark}
                  isExpanded={expandedMcqId === mcq.id}
                  onToggleExpand={(id) => setExpandedMcqId(prev => prev === id ? null : id)}
                  isDeleted={showDeleted}
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
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload CSV File</TabsTrigger>
                  <TabsTrigger value="paste">Paste CSV Content</TabsTrigger>
                </TabsList>
                
                {/* File Upload Tab */}
                <TabsContent value="upload" className="space-y-4 mt-4">
                  <DragDropZone
                    id="mcq-csv-upload"
                    onFileSelect={(file) => {
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
                          
                          const parsed = parseMcqCsv(text);
                          
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
              </Tabs>
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
                  disabled={bulkCreateMutation.isPending || itemsToImport === 0}
                >
                  {bulkCreateMutation.isPending 
                    ? 'Importing...' 
                    : `Import ${itemsToImport} Question${itemsToImport !== 1 ? 's' : ''}`
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
                “{deletingMcq?.stem.slice(0, 100)}...”
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent Radix from auto-closing the dialog before the mutation completes.
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
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
              This will restore the deleted question and make it visible again.
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
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {restoreMutation.isPending ? 'Restoring…' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
