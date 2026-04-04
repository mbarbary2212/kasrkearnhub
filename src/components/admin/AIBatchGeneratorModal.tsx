import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  FileText, 
  Layers, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useModules } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useChapterSections } from '@/hooks/useSections';
import { useCreateBatchJob, useStartBatchJob } from '@/hooks/useAIBatchJobs';
import { useIsAIContentFactoryEnabled } from '@/hooks/useAISettings';
import { useAdminDocuments } from '@/hooks/useAdminDocuments';
import { YearGroupedModuleOptions } from '@/components/admin/YearGroupedModuleOptions';

const CONTENT_TYPES = [
  { value: 'mcq', label: 'MCQs', description: 'Multiple choice questions' },
  { value: 'sba', label: 'SBA', description: 'Single Best Answer questions' },
  { value: 'flashcard', label: 'Flashcards', description: 'Study flashcards' },
  { value: 'osce', label: 'OSCE Questions', description: 'Clinical examination questions' },
  { value: 'essay', label: 'Short Essay', description: 'Short essay questions' },
  { value: 'matching', label: 'Matching Questions', description: 'Match items questions' },
  { value: 'clinical_case', label: 'Clinical Cases', description: 'Patient case studies' },
  { value: 'mind_map', label: 'Mind Maps', description: 'Concept mind maps' },
  { value: 'guided_explanation', label: 'Guided Explanations', description: 'Step-by-step explanations' },
];

interface AIBatchGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  prefilledModuleId?: string;
  prefilledChapterId?: string;
}

export function AIBatchGeneratorModal({
  open,
  onOpenChange,
  documentId,
  prefilledModuleId,
  prefilledChapterId,
}: AIBatchGeneratorModalProps) {
  const [selectedModuleId, setSelectedModuleId] = useState(prefilledModuleId || '');
  const [selectedChapterId, setSelectedChapterId] = useState(prefilledChapterId || '');
  const [selectedDocId, setSelectedDocId] = useState(documentId || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [perSection, setPerSection] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true); // Default to auto-approve
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const { data: factoryEnabled, isLoading: factoryLoading } = useIsAIContentFactoryEnabled();
  const { data: modules } = useModules();
  const { data: chapters } = useModuleChapters(selectedModuleId || undefined);
  const { data: sections } = useChapterSections(selectedChapterId || undefined);
  const { data: documents } = useAdminDocuments({
    module_id: selectedModuleId || undefined,
    chapter_id: selectedChapterId || undefined,
  });
  
  const createJob = useCreateBatchJob();
  const startJob = useStartBatchJob();

  // Update module/chapter/document when prefilled values change
  useEffect(() => {
    if (prefilledModuleId) setSelectedModuleId(prefilledModuleId);
    if (prefilledChapterId) setSelectedChapterId(prefilledChapterId);
    if (documentId) setSelectedDocId(documentId);
  }, [prefilledModuleId, prefilledChapterId, documentId]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        const newTypes = prev.filter(t => t !== type);
        // Remove quantity for deselected type
        setQuantities(q => {
          const { [type]: _, ...rest } = q;
          return rest;
        });
        return newTypes;
      } else {
        // Set default quantity
        setQuantities(q => ({ ...q, [type]: 5 }));
        return [...prev, type];
      }
    });
  };

  const handleQuantityChange = (type: string, value: number) => {
    setQuantities(prev => ({ ...prev, [type]: Math.max(1, Math.min(50, value)) }));
  };

  const handleSubmit = async () => {
    if (!selectedDocId || !selectedModuleId || selectedTypes.length === 0) return;

    try {
      const job = await createJob.mutateAsync({
        document_id: selectedDocId,
        module_id: selectedModuleId,
        chapter_id: selectedChapterId || undefined,
        content_types: selectedTypes,
        quantities,
        per_section: perSection,
        auto_approve: autoApprove,
        additional_instructions: additionalInstructions || undefined,
      });

      // Optionally auto-start the job
      // await startJob.mutateAsync(job.id);

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const estimatedItems = perSection && sections ? totalItems * sections.length : totalItems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Batch AI Content Generation
          </DialogTitle>
          <DialogDescription>
            Configure batch generation of multiple content types from PDF source.
          </DialogDescription>
        </DialogHeader>

        {factoryLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Checking AI Content Factory status...
          </div>
        ) : !factoryEnabled ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AI Content Factory is currently disabled by administrator. 
              Please contact a Super Admin to enable content generation.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="space-y-6 pb-4 pr-2">
              {/* Module & Chapter Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Module *</Label>
                  <Select 
                    value={selectedModuleId} 
                    onValueChange={(v) => {
                      setSelectedModuleId(v);
                      setSelectedChapterId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      <YearGroupedModuleOptions modules={modules} />
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chapter (Optional)</Label>
                  <Select 
                    value={selectedChapterId || '__all__'} 
                    onValueChange={(v) => setSelectedChapterId(v === '__all__' ? '' : v)}
                    disabled={!selectedModuleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All chapters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All chapters</SelectItem>
                      {chapters?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PDF Document Selection (Required) */}
              <div className="space-y-2">
                <Label>PDF Document *</Label>
                <Select 
                  value={selectedDocId} 
                  onValueChange={setSelectedDocId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PDF document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents && documents.length > 0 ? (
                      documents.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[300px]">{doc.title}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        {selectedModuleId 
                          ? 'No PDFs found for this module/chapter' 
                          : 'Select a module first to see available PDFs'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {!selectedModuleId && (
                  <p className="text-xs text-muted-foreground">
                    Select a module to filter available PDFs
                  </p>
                )}
              </div>

              {/* Content Types */}
              <div className="space-y-3">
                <Label className="text-base">Content Types *</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CONTENT_TYPES.map(type => (
                    <div
                      key={type.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTypes.includes(type.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => handleTypeToggle(type.value)}
                    >
                      <Checkbox
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={() => handleTypeToggle(type.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{type.label}</div>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                        {selectedTypes.includes(type.value) && (
                          <div className="mt-2 flex items-center gap-2">
                            <Label className="text-xs">Qty:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={quantities[type.value] || 5}
                              onChange={(e) => handleQuantityChange(type.value, parseInt(e.target.value) || 5)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 h-7 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sections Preview */}
              {selectedChapterId && sections && sections.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Chapter Sections ({sections.length})
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="per-section"
                        checked={perSection}
                        onCheckedChange={setPerSection}
                      />
                      <Label htmlFor="per-section" className="text-sm">
                        Generate per section
                      </Label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                    {sections.map(s => (
                      <Badge key={s.id} variant="outline" className="text-xs">
                        {s.section_number}: {s.name}
                      </Badge>
                    ))}
                  </div>
                  {perSection && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Each content type will be generated for each section separately
                    </p>
                  )}
                </div>
              )}

              {/* Auto-Approve Warning */}
              <Alert className="border-warning/50 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Content will be automatically added to the curriculum. 
                  You must review all generated items in the respective admin tables after upload.
                </AlertDescription>
              </Alert>

              {/* Options */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instructions">Additional Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Any specific instructions for the AI (e.g., focus on certain topics, difficulty level)..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Summary */}
              {selectedTypes.length > 0 && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Output</span>
                    <Badge variant="default">~{estimatedItems} items</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedTypes.length} content type(s) × {Object.values(quantities).join(' + ')} items
                    {perSection && sections && ` × ${sections.length} sections`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !factoryEnabled ||
              !selectedDocId ||
              !selectedModuleId ||
              selectedTypes.length === 0 ||
              createJob.isPending
            }
          >
            {createJob.isPending ? 'Creating...' : 'Create Batch Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
