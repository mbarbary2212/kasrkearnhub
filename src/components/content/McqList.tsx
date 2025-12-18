import { useState, useRef } from 'react';
import { Plus, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { McqCard } from './McqCard';
import { McqFormModal } from './McqFormModal';
import { useDeleteMcq, useBulkCreateMcqs, parseMcqCsv, type Mcq } from '@/hooks/useMcqs';

interface McqListProps {
  mcqs: Mcq[];
  moduleId: string;
  chapterId?: string | null;
  isAdmin: boolean;
}

const CSV_TEMPLATE = `stem,choiceA,choiceB,choiceC,choiceD,choiceE,correct_key,explanation,difficulty
"What is the capital of France?",Paris,London,Berlin,Madrid,Rome,A,"Paris is the capital and largest city of France.",easy
"Which organ produces insulin?",Heart,Liver,Pancreas,Kidney,Spleen,C,"The pancreas contains islet cells that produce insulin.",medium`;

export function McqList({ mcqs, moduleId, chapterId, isAdmin }: McqListProps) {
  const [editingMcq, setEditingMcq] = useState<Mcq | null>(null);
  const [deletingMcq, setDeletingMcq] = useState<Mcq | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState<ReturnType<typeof parseMcqCsv> | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteMutation = useDeleteMcq();
  const bulkCreateMutation = useBulkCreateMcqs();

  const handleDelete = () => {
    if (!deletingMcq) return;
    
    deleteMutation.mutate(
      { id: deletingMcq.id, moduleId, chapterId },
      { onSuccess: () => setDeletingMcq(null) }
    );
  };

  const handlePreviewCsv = () => {
    if (!csvText.trim()) return;
    const parsed = parseMcqCsv(csvText);
    setPreviewData(parsed);
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
        
        setPreviewData(parsed);
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

  const handleBulkImport = () => {
    if (!previewData || previewData.length === 0) return;
    
    bulkCreateMutation.mutate(
      { mcqs: previewData, moduleId, chapterId },
      {
        onSuccess: () => {
          setShowBulkModal(false);
          setCsvText('');
          setPreviewData(null);
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

  if (mcqs.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No MCQs available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex justify-end gap-2">
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

      {/* MCQ Cards */}
      {mcqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No MCQs yet. Click "Add Question" to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mcqs.map((mcq, index) => (
            <McqCard
              key={mcq.id}
              mcq={mcq}
              index={index}
              isAdmin={isAdmin}
              onEdit={() => setEditingMcq(mcq)}
              onDelete={() => setDeletingMcq(mcq)}
            />
          ))}
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

      {/* Bulk Import Modal */}
      <Dialog open={showBulkModal} onOpenChange={(open) => {
        setShowBulkModal(open);
        if (!open) {
          resetBulkModal();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import MCQs</DialogTitle>
            <DialogDescription>
              Upload a CSV file or paste CSV content to import multiple MCQs
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
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
              /* Preview Section */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <Label>Preview ({previewData.length} questions ready)</Label>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetBulkModal}>
                    Start Over
                  </Button>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-3 bg-muted/30">
                  {previewData.map((mcq, i) => (
                    <div key={i} className="text-sm p-2 bg-background rounded border">
                      <p className="font-medium">{i + 1}. {mcq.stem}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Answer: {mcq.correct_key} | Difficulty: {mcq.difficulty || 'not set'}
                      </p>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleBulkImport} 
                  className="w-full"
                  disabled={bulkCreateMutation.isPending}
                >
                  {bulkCreateMutation.isPending ? 'Importing...' : `Import ${previewData.length} Questions`}
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
