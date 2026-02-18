import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Layers,
  RefreshCw,
  AlertCircle,
  Image,
  ArrowLeftRight,
  UserRound,
  Network,
  Stethoscope,
  GraduationCap,
  MessageCircleQuestion,
  Info
} from 'lucide-react';
import { AIContentPreviewCard } from './AIContentPreviewCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useModules } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useChapterSections } from '@/hooks/useSections';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdminDocument {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  module_id: string | null;
  chapter_id: string | null;
  module?: { id: string; name: string } | null;
  chapter?: { id: string; title: string } | null;
}

interface AIContentFactoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  prefilledModuleId?: string;
  prefilledChapterId?: string;
}

interface ContentTypeOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'practice' | 'resources';
  requiresChapter?: boolean;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  // Practice Types
  { value: 'mcq', label: 'MCQ Questions', icon: HelpCircle, description: 'Multiple choice questions (A-E)', category: 'practice' },
  { value: 'osce', label: 'OSCE Questions', icon: Image, description: 'Clinical stations with 5 true/false statements', category: 'practice', requiresChapter: true },
  { value: 'clinical_case', label: 'Clinical Cases', icon: Stethoscope, description: 'Interactive clinical case scenarios with multiple stages', category: 'practice' },
  { value: 'matching', label: 'Matching Questions', icon: ArrowLeftRight, description: 'Match Column A to Column B', category: 'practice' },
  { value: 'essay', label: 'Essay / Short Answer', icon: BookOpen, description: 'Open questions with model answers', category: 'practice' },
  
  // Resource Types
  { value: 'flashcard', label: 'Flashcards', icon: Layers, description: 'Study flashcards (front/back)', category: 'resources', requiresChapter: true },
  { value: 'mind_map', label: 'Mind Map', icon: Network, description: 'Visual concept hierarchy', category: 'resources', requiresChapter: true },
  { value: 'worked_case', label: 'Worked Case', icon: Stethoscope, description: 'Step-by-step clinical walkthrough', category: 'resources', requiresChapter: true },
  { value: 'guided_explanation', label: 'Guided Explanations', icon: MessageCircleQuestion, description: 'Socratic-style Q&A that guides students through reasoning', category: 'resources', requiresChapter: true },
];

type ProgressState = 'idle' | 'preparing' | 'generating' | 'saving' | 'complete' | 'error';

export function AIContentFactoryModal({ 
  open, 
  onOpenChange, 
  documentId,
  prefilledModuleId,
  prefilledChapterId 
}: AIContentFactoryModalProps) {
  const [selectedDocId, setSelectedDocId] = useState(documentId || '');
  const [contentType, setContentType] = useState('mcq');
  const [moduleId, setModuleId] = useState(prefilledModuleId || '');
  const [chapterId, setChapterId] = useState(prefilledChapterId || '');
  const [quantity, setQuantity] = useState('5');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progressState, setProgressState] = useState<ProgressState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socraticMode, setSocraticMode] = useState(false);
  const [perSection, setPerSection] = useState(false);
  const [sectionProgress, setSectionProgress] = useState<string | null>(null);

  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: modules } = useModules();
  const { data: chapters } = useModuleChapters(moduleId || undefined);
  const { data: sections } = useChapterSections(chapterId || undefined);

  const selectedContentType = CONTENT_TYPES.find(t => t.value === contentType);
  const requiresChapter = selectedContentType?.requiresChapter ?? false;

  const isLowCapType = contentType === 'virtual_patient' || contentType === 'clinical_case';
  const maxQty = isLowCapType ? 5 : 50;

  const hasSections = sections && sections.length > 0;
  const parsedQty = Math.max(1, Math.min(maxQty, parseInt(quantity) || 5));
  const estimatedTotal = perSection && hasSections ? parsedQty * sections.length : parsedQty;

  // Fetch available documents
  const { data: documents } = useQuery({
    queryKey: ['admin-documents-for-factory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_documents')
        .select('id, title, description, storage_path, module_id, chapter_id, module:modules(id, name), chapter:module_chapters(id, title)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AdminDocument[];
    },
    enabled: open,
  });

  const selectedDoc = documents?.find(d => d.id === selectedDocId);

  useEffect(() => {
    if (documentId) setSelectedDocId(documentId);
    if (prefilledModuleId) setModuleId(prefilledModuleId);
    if (prefilledChapterId) setChapterId(prefilledChapterId);
  }, [documentId, prefilledModuleId, prefilledChapterId]);

  useEffect(() => {
    if (selectedDoc && !prefilledModuleId) {
      if (selectedDoc.module_id) setModuleId(selectedDoc.module_id);
      if (selectedDoc.chapter_id) setChapterId(selectedDoc.chapter_id);
    }
  }, [selectedDoc, prefilledModuleId]);

  const getValidSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session;
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error('Session expired. Please sign in again.');
    if (!refreshData.session?.access_token) throw new Error('Session expired. Please sign in again.');
    return refreshData.session;
  }, []);

  const invokeWithAuth = useCallback(
    async (functionName: string, payload: any, retryCount = 0): Promise<any> => {
      const session = await getValidSession();
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const errorMsg = error.message || '';
        if ((errorMsg.includes('Unauthorized') || errorMsg.includes('session') || errorMsg.includes('401') || errorMsg.includes('403')) && retryCount === 0) {
          await supabase.auth.refreshSession();
          return invokeWithAuth(functionName, payload, 1);
        }
        if (retryCount === 0 && (errorMsg.includes('network') || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503'))) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return invokeWithAuth(functionName, payload, 1);
        }
        throw error;
      }
      return data;
    },
    [getValidSession]
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocId) throw new Error('Please select a source document');
      if (!moduleId) throw new Error('Please select a target module');
      if (requiresChapter && !chapterId) throw new Error(`Please select a chapter (required for ${selectedContentType?.label})`);

      setProgressState('preparing');
      setErrorMessage(null);
      setProgressState('generating');

      const clampedQty = Math.max(1, Math.min(maxQty, parseInt(quantity) || 5));

      // Per-section mode: loop through sections sequentially
      if (perSection && hasSections && sections.length > 0) {
        const allItems: any[] = [];
        const allWarnings: string[] = [];
        let lastJobId: string | null = null;

        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          setSectionProgress(`Generating section ${sec.section_number || sec.name}... (${i + 1}/${sections.length})`);

          const data = await invokeWithAuth('generate-content-from-pdf', {
            document_id: selectedDocId,
            content_type: contentType,
            module_id: moduleId,
            chapter_id: chapterId || null,
            quantity: clampedQty,
            additional_instructions: additionalInstructions || null,
            socratic_mode: socraticMode,
            target_section_number: sec.section_number || null,
          });

          if (data?.error) {
            allWarnings.push(`Section ${sec.section_number}: ${data.error}`);
            continue;
          }

          if (Array.isArray(data?.items)) {
            allItems.push(...data.items);
          }
          if (Array.isArray(data?.warnings)) {
            allWarnings.push(...data.warnings);
          }
          if (data?.job_id) lastJobId = data.job_id;

          // Small delay between section calls
          if (i < sections.length - 1) {
            await new Promise(r => setTimeout(r, 500));
          }
        }

        setSectionProgress(null);

        if (allItems.length === 0) {
          throw new Error('No items generated across any section. Please retry.');
        }

        setJobId(lastJobId);
        setGeneratedContent({ items: allItems, warnings: allWarnings, job_id: lastJobId, content_type: contentType });
        setProgressState('complete');
        return { items: allItems, job_id: lastJobId };
      }

      // Standard single-call mode
      const data = await invokeWithAuth('generate-content-from-pdf', {
        document_id: selectedDocId,
        content_type: contentType,
        module_id: moduleId,
        chapter_id: chapterId || null,
        quantity: clampedQty,
        additional_instructions: additionalInstructions || null,
        socratic_mode: socraticMode,
      });

      if (data?.error) throw new Error(data.error);
      if (!data?.job_id) throw new Error('Generation returned no job id. Please retry.');
      if (!Array.isArray(data?.items)) throw new Error('Generation produced an invalid payload. Please retry.');

      setJobId(data.job_id);
      setGeneratedContent(data);
      setProgressState('complete');
      return data;
    },
    onSuccess: () => {
      toast.success('Content generated! Review before approving.');
    },
    onError: (error: Error) => {
      console.error('Generation error:', error);
      setProgressState('error');
      setErrorMessage(error.message);
      setSectionProgress(null);
      if (error.message.includes('session') || error.message.includes('sign in')) {
        toast.error('Session expired. Please refresh the page and sign in again.');
      } else {
        toast.error(`Generation failed: ${error.message}`);
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error('No generation job to approve');
      setProgressState('saving');

      const items = generatedContent?.items;
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Generation produced an invalid payload. Please retry.');
      }

      const data = await invokeWithAuth('approve-ai-content', { job_id: jobId });
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data?.items)) throw new Error('Approval returned an invalid payload. Please retry.');

      setProgressState('complete');
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai_generation_jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['mcqs'] }),
        queryClient.invalidateQueries({ queryKey: ['study-resources'] }),
        queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-cases'] }),
        queryClient.invalidateQueries({ queryKey: ['essays'] }),
        queryClient.invalidateQueries({ queryKey: ['chapter-content', chapterId] }),
        queryClient.invalidateQueries({ queryKey: ['module-content', moduleId] }),
        queryClient.invalidateQueries({ queryKey: ['osce-questions'] }),
        queryClient.invalidateQueries({ queryKey: ['matching-questions'] }),
        queryClient.invalidateQueries({ queryKey: ['guided-explanations'] }),
      ]);
      toast.success('Content approved and saved!');
      handleClose();
    },
    onError: (error: Error) => {
      setProgressState('error');
      setErrorMessage(error.message);
      toast.error(`Approval failed: ${error.message}`);
    },
  });

  const handleClose = () => {
    setSelectedDocId('');
    setContentType('mcq');
    setModuleId('');
    setChapterId('');
    setQuantity('5');
    setAdditionalInstructions('');
    setGeneratedContent(null);
    setJobId(null);
    setProgressState('idle');
    setErrorMessage(null);
    setSocraticMode(false);
    setPerSection(false);
    setSectionProgress(null);
    onOpenChange(false);
  };

  const handleRetry = () => {
    setProgressState('idle');
    setErrorMessage(null);
    setGeneratedContent(null);
    setJobId(null);
    setSectionProgress(null);
  };

  const getProgressLabel = () => {
    if (sectionProgress) return sectionProgress;
    switch (progressState) {
      case 'preparing': return 'Preparing request...';
      case 'generating': return 'Generating content with AI...';
      case 'saving': return 'Saving to chapter...';
      case 'complete': return 'Complete!';
      case 'error': return 'Error occurred';
      default: return '';
    }
  };

  const practiceTypes = CONTENT_TYPES.filter(t => t.category === 'practice');
  const resourceTypes = CONTENT_TYPES.filter(t => t.category === 'resources');

  const handleItemUpdate = (index: number, updatedItem: any) => {
    if (!generatedContent?.items) return;
    const updatedItems = [...generatedContent.items];
    updatedItems[index] = updatedItem;
    setGeneratedContent({ ...generatedContent, items: updatedItems });
  };

  const handleItemDelete = (index: number) => {
    if (!generatedContent?.items) return;
    const updatedItems = generatedContent.items.filter((_: any, i: number) => i !== index);
    setGeneratedContent({ ...generatedContent, items: updatedItems });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Content Factory
          </DialogTitle>
          <DialogDescription>
            Generate educational content from PDF documents. All generated content is reviewed before publishing.
          </DialogDescription>
        </DialogHeader>

        {/* Safety Notice */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <strong className="text-amber-700 dark:text-amber-400">AI Safety:</strong>
            <span className="text-amber-600 dark:text-amber-300 ml-1">
              PDFs are treated as untrusted data. Generated content requires admin approval before being added to the curriculum.
            </span>
          </div>
        </div>

        {/* Progress Indicator */}
        {progressState !== 'idle' && progressState !== 'complete' && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            {progressState === 'error' ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            )}
            <span className={progressState === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
              {getProgressLabel()}
            </span>
          </div>
        )}

        {/* Error Alert with Retry */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <Button variant="outline" size="sm" onClick={handleRetry} className="ml-4">
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="flex-1 min-h-0 pr-4">
          {!generatedContent ? (
            <div className="space-y-6 py-4">
              {/* Source Document Selection */}
              <div className="space-y-2">
                <Label>Source Document *</Label>
                <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a PDF from the library" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents?.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {doc.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDoc && (
                  <p className="text-xs text-muted-foreground">
                    {selectedDoc.description || 'No description'}
                  </p>
                )}
              </div>

              {/* Content Type - Practice */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Practice Content
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {practiceTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setContentType(type.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        contentType === type.value
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <type.icon className="w-4 h-4 shrink-0" />
                        <span className="font-medium text-sm truncate">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Type - Resources */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Study Resources
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {resourceTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setContentType(type.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        contentType === type.value
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <type.icon className="w-4 h-4 shrink-0" />
                        <span className="font-medium text-sm truncate">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Module/Chapter */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Module *</Label>
                  <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setChapterId(''); setPerSection(false); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules?.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Target Chapter {requiresChapter ? '*' : '(Optional)'}
                  </Label>
                  <Select value={chapterId} onValueChange={(v) => { setChapterId(v); setPerSection(false); }} disabled={!moduleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Per-Section Toggle */}
              {chapterId && hasSections && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Chapter Sections ({sections.length})
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="per-section-factory"
                        checked={perSection}
                        onCheckedChange={setPerSection}
                      />
                      <Label htmlFor="per-section-factory" className="text-sm">
                        Generate per section
                      </Label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 p-3 bg-muted/30 rounded-lg max-h-24 overflow-y-auto">
                    {sections.map(s => (
                      <Badge key={s.id} variant="outline" className="text-xs">
                        {s.section_number}: {s.name}
                      </Badge>
                    ))}
                  </div>
                  {perSection && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Estimated Output</span>
                        <Badge variant="default">~{estimatedTotal} items</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {parsedQty} items × {sections.length} sections = {estimatedTotal} total
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity & Socratic Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Items {perSection ? '(per section)' : ''}</Label>
                  <Input
                    type="number"
                    min="1"
                    max={String(maxQty)}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum {maxQty} items {perSection ? 'per section' : 'per generation'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Socratic Mode
                  </Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={socraticMode}
                      onCheckedChange={setSocraticMode}
                    />
                    <span className="text-sm text-muted-foreground">
                      {socraticMode ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uses guided-discovery questions in explanations
                  </p>
                </div>
              </div>

              {/* Additional Instructions */}
              <div className="space-y-2">
                <Label>Additional Instructions (Optional)</Label>
                <Textarea
                  placeholder="e.g., Focus on pharmacology topics, include clinical scenarios, target beginner level..."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            /* Generated Content Preview */
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Content Generated Successfully</span>
                <Badge variant="outline" className="ml-2">{generatedContent?.items?.length || 0} items</Badge>
              </div>

              {/* Generation Stats */}
              {generatedContent?.generation_stats && (
                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                  Requested: {generatedContent.generation_stats.requested} | 
                  Raw: {generatedContent.generation_stats.raw_generated} | 
                  After dedup: {generatedContent.generation_stats.after_dedup} | 
                  Chunks: {generatedContent.generation_stats.chunks_used}
                  {generatedContent.generation_stats.topup_rounds > 0 && ` | Top-ups: ${generatedContent.generation_stats.topup_rounds}`}
                </div>
              )}
              
              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <div className="space-y-3">
                    {Array.isArray(generatedContent?.items) && generatedContent.items.length > 0
                      ? generatedContent.items.map((item: any, idx: number) => (
                          <AIContentPreviewCard
                            key={idx}
                            item={item}
                            index={idx}
                            contentType={contentType}
                            onUpdate={handleItemUpdate}
                            onDelete={handleItemDelete}
                          />
                        ))
                      : (
                        <Card>
                          <CardContent className="p-4">
                            <pre className="text-sm whitespace-pre-wrap">
                              {JSON.stringify(generatedContent, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      )
                    }
                  </div>
                </TabsContent>
                <TabsContent value="raw" className="mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-xs overflow-auto max-h-[300px]">
                        {JSON.stringify(generatedContent, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {generatedContent ? 'Discard' : 'Cancel'}
          </Button>
          
          {!generatedContent ? (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!selectedDocId || !moduleId || generateMutation.isPending || (requiresChapter && !chapterId)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {getProgressLabel() || 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {perSection && hasSections ? `~${estimatedTotal} Items` : 'Content'}
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setGeneratedContent(null)}
              >
                Regenerate
              </Button>
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {getProgressLabel() || 'Saving...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve & Save
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
