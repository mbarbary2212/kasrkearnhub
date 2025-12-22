import { useState, useRef, useMemo, useCallback } from 'react';
import { Plus, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, Copy, Filter, Star } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { McqCard } from './McqCard';
import { McqFormModal } from './McqFormModal';
import { useDeleteMcq, useBulkCreateMcqs, parseMcqCsv, type Mcq, type McqFormData } from '@/hooks/useMcqs';
import { isMcqDuplicate, findDuplicates, type DuplicateResult } from '@/lib/duplicateDetection';

interface McqListProps {
  mcqs: Mcq[];
  moduleId: string;
  chapterId?: string | null;
  isAdmin: boolean;
}

const CSV_TEMPLATE = `stem,choiceA,choiceB,choiceC,choiceD,choiceE,correct_key,explanation,difficulty
"What is the capital of France?",Paris,London,Berlin,Madrid,Rome,A,"Paris is the capital and largest city of France.",easy
"Which organ produces insulin?",Heart,Liver,Pancreas,Kidney,Spleen,C,"The pancreas contains islet cells that produce insulin.",medium`;

const SIMILARITY_THRESHOLD = 0.85;

export function McqList({ mcqs, moduleId, chapterId, isAdmin }: McqListProps) {
  const [editingMcq, setEditingMcq] = useState<Mcq | null>(null);
  const [deletingMcq, setDeletingMcq] = useState<Mcq | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState<DuplicateResult<McqFormData>[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [expandedMcqId, setExpandedMcqId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteMutation = useDeleteMcq();
  const bulkCreateMutation = useBulkCreateMcqs();

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
    let result = mcqs;
    if (showDuplicatesOnly) {
      result = result.filter(mcq => duplicateIds.has(mcq.id));
    }
    if (showMarkedOnly) {
      result = result.filter(mcq => markedIds.has(mcq.id));
    }
    return result;
  }, [mcqs, showDuplicatesOnly, duplicateIds, showMarkedOnly, markedIds]);

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
    if (!deletingMcq) return;
    
    deleteMutation.mutate(
      { id: deletingMcq.id, moduleId, chapterId },
      { onSuccess: () => setDeletingMcq(null) }
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

  if (mcqs.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No MCQs available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Marked for Review filter - always available */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-3 w-3" />
                Filters
                {(showDuplicatesOnly || showMarkedOnly) && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {(showDuplicatesOnly ? 1 : 0) + (showMarkedOnly ? 1 : 0)}
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
              {isAdmin && duplicateMcqs.length > 0 && (
                <DropdownMenuCheckboxItem
                  checked={showDuplicatesOnly}
                  onCheckedChange={setShowDuplicatesOnly}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Show duplicates only ({duplicateMcqs.length})
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkModal(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>
        )}
      </div>

      {/* Duplicate Alert */}
      {isAdmin && showDuplicatesOnly && duplicateMcqs.length > 0 && (
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
            {showMarkedOnly 
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
            const duplicateInfo = duplicateMcqs.find(d => d.mcq.id === mcq.id);
            return (
              <div key={mcq.id} className="relative">
                {duplicateInfo && (
                  <Badge 
                    variant="outline" 
                    className="absolute -top-2 right-2 z-10 bg-amber-50 text-amber-700 border-amber-300"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {Math.round(duplicateInfo.similarity * 100)}% similar
                  </Badge>
                )}
                <McqCard
                  mcq={mcq}
                  index={index}
                  isAdmin={isAdmin}
                  onEdit={() => setEditingMcq(mcq)}
                  onDelete={() => setDeletingMcq(mcq)}
                  isMarked={markedIds.has(mcq.id)}
                  onToggleMark={toggleMark}
                  isExpanded={expandedMcqId === mcq.id}
                  onToggleExpand={(id) => setExpandedMcqId(prev => prev === id ? null : id)}
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
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    {fileName ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium">{fileName}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">Click to upload CSV file</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Or drag and drop your file here
                        </p>
                      </div>
                    )}
                  </div>

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
      <AlertDialog open={!!deletingMcq} onOpenChange={(open) => !open && setDeletingMcq(null)}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MCQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
              <br />
              <span className="font-medium mt-2 block text-foreground">
                "{deletingMcq?.stem.slice(0, 100)}..."
              </span>
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
