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
  GraduationCap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useModules } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
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
  { value: 'case_scenario', label: 'Case Scenarios', icon: ClipboardList, description: 'Clinical case-based learning', category: 'practice' },
  { value: 'matching', label: 'Matching Questions', icon: ArrowLeftRight, description: 'Match Column A to Column B', category: 'practice' },
  { value: 'essay', label: 'Essay / Short Answer', icon: BookOpen, description: 'Open questions with model answers', category: 'practice' },
  { value: 'virtual_patient', label: 'Virtual Patient', icon: UserRound, description: 'Multi-stage case with MCQ/short-answer stages', category: 'practice' },
  
  // Resource Types
  { value: 'flashcard', label: 'Flashcards', icon: Layers, description: 'Study flashcards (front/back)', category: 'resources', requiresChapter: true },
  { value: 'mind_map', label: 'Mind Map', icon: Network, description: 'Visual concept hierarchy', category: 'resources', requiresChapter: true },
  { value: 'worked_case', label: 'Worked Case', icon: Stethoscope, description: 'Step-by-step clinical walkthrough', category: 'resources', requiresChapter: true },
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

  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: modules } = useModules();
  const { data: chapters } = useModuleChapters(moduleId || undefined);

  const selectedContentType = CONTENT_TYPES.find(t => t.value === contentType);
  const requiresChapter = selectedContentType?.requiresChapter ?? false;

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

  // Fetch selected document details
  const selectedDoc = documents?.find(d => d.id === selectedDocId);

  // Update state when props change
  useEffect(() => {
    if (documentId) setSelectedDocId(documentId);
    if (prefilledModuleId) setModuleId(prefilledModuleId);
    if (prefilledChapterId) setChapterId(prefilledChapterId);
  }, [documentId, prefilledModuleId, prefilledChapterId]);

  // Auto-fill module/chapter from selected document
  useEffect(() => {
    if (selectedDoc && !prefilledModuleId) {
      if (selectedDoc.module_id) setModuleId(selectedDoc.module_id);
      if (selectedDoc.chapter_id) setChapterId(selectedDoc.chapter_id);
    }
  }, [selectedDoc, prefilledModuleId]);

  // Get fresh session with retry logic
  const getValidSession = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      return session;
    }

    console.log('No active session, attempting refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('Session refresh failed:', refreshError);
      throw new Error('Session expired. Please sign in again.');
    }
    
    if (!refreshData.session?.access_token) {
      throw new Error('Session expired. Please sign in again.');
    }

    return refreshData.session;
  }, []);

  // Invoke edge function with proper auth and retry
  const invokeWithAuth = useCallback(
    async (functionName: string, payload: any, retryCount = 0): Promise<any> => {
      const session = await getValidSession();

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        const errorMsg = error.message || '';

        if (
          errorMsg.includes('Unauthorized') ||
          errorMsg.includes('session') ||
          errorMsg.includes('401') ||
          errorMsg.includes('403')
        ) {
          if (retryCount === 0) {
            console.log('Auth error, refreshing session and retrying...');
            await supabase.auth.refreshSession();
            return invokeWithAuth(functionName, payload, 1);
          }
          throw new Error('Your session has expired. Please refresh the page and sign in again.');
        }

        if (
          retryCount === 0 &&
          (errorMsg.includes('network') ||
            errorMsg.includes('500') ||
            errorMsg.includes('502') ||
            errorMsg.includes('503'))
        ) {
          console.log('Transient error, retrying once...');
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

      const data = await invokeWithAuth('generate-content-from-pdf', {
        document_id: selectedDocId,
        content_type: contentType,
        module_id: moduleId,
        chapter_id: chapterId || null,
        quantity: parseInt(quantity),
        additional_instructions: additionalInstructions || null,
        socratic_mode: socraticMode,
      });

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.job_id) {
        throw new Error('Generation returned no job id. Please retry.');
      }

      if (!Array.isArray(data?.items)) {
        console.error('Invalid generation payload (items is not an array):', data);
        throw new Error('Generation produced an invalid payload. Please retry.');
      }

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

      const items =
        generatedContent &&
        typeof generatedContent === 'object' &&
        Array.isArray((generatedContent as any).items)
          ? ((generatedContent as any).items as any[])
          : null;

      if (!items || items.length === 0) {
        console.error('Invalid generated payload (missing items[]):', generatedContent);
        throw new Error('Generation produced an invalid payload. Please retry.');
      }

      const data = await invokeWithAuth('approve-ai-content', { job_id: jobId });

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!Array.isArray(data?.items)) {
        console.error('Invalid approval payload (items is not an array):', data);
        throw new Error('Approval returned an invalid payload. Please retry.');
      }

      setProgressState('complete');
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai_generation_jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['mcqs'] }),
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', moduleId] }),
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', chapterId] }),
        queryClient.invalidateQueries({ queryKey: ['study-resources'] }),
        queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', chapterId] }),
        queryClient.invalidateQueries({ queryKey: ['study-resources', 'module', moduleId] }),
        queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
        queryClient.invalidateQueries({ queryKey: ['case-scenarios'] }),
        queryClient.invalidateQueries({ queryKey: ['case-scenarios', 'chapter', chapterId] }),
        queryClient.invalidateQueries({ queryKey: ['case-scenarios', 'module', moduleId] }),
        queryClient.invalidateQueries({ queryKey: ['chapter-essays', chapterId] }),
        queryClient.invalidateQueries({ queryKey: ['essays'] }),
        queryClient.invalidateQueries({ queryKey: ['chapter-content', chapterId] }),
        queryClient.invalidateQueries({ queryKey: ['module-content', moduleId] }),
        queryClient.invalidateQueries({ queryKey: ['osce-questions'] }),
        queryClient.invalidateQueries({ queryKey: ['matching-questions'] }),
        queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] }),
      ]);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['ai_generation_jobs'] }),
        queryClient.refetchQueries({ queryKey: ['chapter-content', chapterId] }),
        queryClient.refetchQueries({ queryKey: ['module-content', moduleId] }),
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
    onOpenChange(false);
  };

  const handleRetry = () => {
    setProgressState('idle');
    setErrorMessage(null);
    setGeneratedContent(null);
    setJobId(null);
  };

  const getProgressLabel = () => {
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

  // Render preview based on content type
  const renderPreviewItem = (item: any, idx: number) => {
    const typeLabel = contentType.toUpperCase().replace('_', ' ');
    
    if (contentType === 'mcq') {
      return (
        <Card key={idx}>
          <CardContent className="p-4 space-y-2">
            <Badge variant="secondary">{typeLabel} #{idx + 1}</Badge>
            <p className="font-medium">{item.stem}</p>
            <div className="grid gap-1 text-sm">
              {Object.entries(item.choices || {}).map(([key, val]) => (
                <div key={key} className={`flex gap-2 ${key === item.correct_key ? 'text-green-600 font-medium' : ''}`}>
                  <span>{key}.</span>
                  <span>{String(val)}</span>
                  {key === item.correct_key && <CheckCircle2 className="w-4 h-4" />}
                </div>
              ))}
            </div>
            {item.explanation && <p className="text-muted-foreground text-sm mt-2">{item.explanation}</p>}
          </CardContent>
        </Card>
      );
    }
    
    if (contentType === 'virtual_patient') {
      return (
        <Card key={idx}>
          <CardContent className="p-4 space-y-2">
            <Badge variant="secondary">Virtual Patient #{idx + 1}</Badge>
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.intro_text?.substring(0, 200)}...</p>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="outline">{item.level}</Badge>
              <Badge variant="outline">{item.estimated_minutes} min</Badge>
              <Badge variant="outline">{item.stages?.length || 0} stages</Badge>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (contentType === 'osce') {
      return (
        <Card key={idx}>
          <CardContent className="p-4 space-y-2">
            <Badge variant="secondary">OSCE #{idx + 1}</Badge>
            <p className="text-sm">{item.history_text?.substring(0, 150)}...</p>
            <div className="space-y-1 text-sm">
              {[1, 2, 3, 4, 5].map(n => item[`statement_${n}`] && (
                <div key={n} className="flex items-center gap-2">
                  <Badge variant={item[`answer_${n}`] ? 'default' : 'destructive'} className="text-xs">
                    {item[`answer_${n}`] ? 'T' : 'F'}
                  </Badge>
                  <span>{item[`statement_${n}`]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Fallback: JSON display
    return (
      <Card key={idx}>
        <CardContent className="p-4">
          <Badge className="mb-2">{typeLabel} #{idx + 1}</Badge>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(item, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
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
                  <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setChapterId(''); }}>
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
                  <Select value={chapterId} onValueChange={setChapterId} disabled={!moduleId}>
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

              {/* Quantity & Socratic Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Items</Label>
                  <Input
                    type="number"
                    min="1"
                    max={contentType === 'virtual_patient' ? '5' : '20'}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum {contentType === 'virtual_patient' ? '5' : '20'} items per generation
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
              
              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <div className="space-y-3">
                    {Array.isArray(generatedContent?.items) 
                      ? generatedContent.items.map((item: any, idx: number) => renderPreviewItem(item, idx))
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
                  Generate Content
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
