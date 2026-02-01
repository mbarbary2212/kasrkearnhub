import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const CONTENT_TYPES = [
  { value: 'mcq', label: 'MCQs', description: 'Multiple choice questions' },
  { value: 'flashcard', label: 'Flashcards', description: 'Study flashcards' },
  { value: 'osce', label: 'OSCE Questions', description: 'Clinical examination questions' },
  { value: 'essay', label: 'Essays', description: 'Short answer questions' },
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [perSection, setPerSection] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const { data: factoryEnabled, isLoading: factoryLoading } = useIsAIContentFactoryEnabled();
  const { data: modules } = useModules();
  const { data: chapters } = useModuleChapters(selectedModuleId || undefined);
  const { data: sections } = useChapterSections(selectedChapterId || undefined);
  
  const createJob = useCreateBatchJob();
  const startJob = useStartBatchJob();

  // Update module/chapter when prefilled values change
  useEffect(() => {
    if (prefilledModuleId) setSelectedModuleId(prefilledModuleId);
    if (prefilledChapterId) setSelectedChapterId(prefilledChapterId);
  }, [prefilledModuleId, prefilledChapterId]);

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
    if (!selectedModuleId || selectedTypes.length === 0) return;

    try {
      const job = await createJob.mutateAsync({
        document_id: documentId,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
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
                      {[...(modules || [])].sort((a, b) => {
                        const numA = parseInt(a.slug?.match(/\d+/)?.[0] || '999');
                        const numB = parseInt(b.slug?.match(/\d+/)?.[0] || '999');
                        return numA - numB;
                      }).map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.slug}: {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chapter (Optional)</Label>
                  <Select 
                    value={selectedChapterId} 
                    onValueChange={setSelectedChapterId}
                    disabled={!selectedModuleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All chapters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All chapters</SelectItem>
                      {chapters?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Document Info */}
              {documentId && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Using selected PDF document as source</span>
                </div>
              )}

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

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label htmlFor="auto-approve">Auto-approve content</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically approve generated content without manual review
                    </p>
                  </div>
                  <Switch
                    id="auto-approve"
                    checked={autoApprove}
                    onCheckedChange={setAutoApprove}
                  />
                </div>

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
          </ScrollArea>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !factoryEnabled ||
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
