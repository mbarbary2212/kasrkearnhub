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
  AlertCircle
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

const CONTENT_TYPES = [
  { value: 'mcq', label: 'MCQ Questions', icon: HelpCircle, description: 'Generate multiple choice questions' },
  { value: 'flashcard', label: 'Flashcards', icon: Layers, description: 'Create study flashcards' },
  { value: 'case_scenario', label: 'Case Scenarios', icon: ClipboardList, description: 'Generate clinical case scenarios' },
  { value: 'essay', label: 'Essay Questions', icon: BookOpen, description: 'Create essay/short answer questions' },
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

  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: modules } = useModules();
  const { data: chapters } = useModuleChapters(moduleId || undefined);

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
    // First try to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      return session;
    }

    // If no session, try to refresh
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
  const invokeWithAuth = useCallback(async (payload: any, retryCount = 0): Promise<any> => {
    const session = await getValidSession();
    
    const { data, error } = await supabase.functions.invoke('generate-content-from-pdf', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      const errorMsg = error.message || '';
      
      // Check for auth-related errors
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('session') || 
          errorMsg.includes('401') || errorMsg.includes('403')) {
        // Try refresh and retry once
        if (retryCount === 0) {
          console.log('Auth error, refreshing session and retrying...');
          await supabase.auth.refreshSession();
          return invokeWithAuth(payload, 1);
        }
        throw new Error('Your session has expired. Please refresh the page and sign in again.');
      }

      // Retry on transient failures (network, 5xx)
      if (retryCount === 0 && (errorMsg.includes('network') || errorMsg.includes('500') || 
          errorMsg.includes('502') || errorMsg.includes('503'))) {
        console.log('Transient error, retrying once...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return invokeWithAuth(payload, 1);
      }

      throw error;
    }

    return data;
  }, [getValidSession]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocId) throw new Error('Please select a source document');
      if (!moduleId) throw new Error('Please select a target module');

      setProgressState('preparing');
      setErrorMessage(null);

      // Create job record for audit
      const { data: job, error: jobError } = await supabase
        .from('ai_generation_jobs')
        .insert({
          document_id: selectedDocId,
          admin_id: user?.id,
          job_type: contentType,
          status: 'processing',
          input_metadata: {
            module_id: moduleId,
            chapter_id: chapterId || null,
            quantity: parseInt(quantity),
            additional_instructions: additionalInstructions || null,
          },
        })
        .select()
        .single();

      if (jobError) throw jobError;
      setJobId(job.id);

      setProgressState('generating');

      // Call edge function with proper auth
      const data = await invokeWithAuth({
        job_id: job.id,
        document_id: selectedDocId,
        content_type: contentType,
        module_id: moduleId,
        chapter_id: chapterId || null,
        quantity: parseInt(quantity),
        additional_instructions: additionalInstructions || null,
      });

      if (data.error) {
        // Update job status on error
        await supabase
          .from('ai_generation_jobs')
          .update({ status: 'failed', error_message: data.error })
          .eq('id', job.id);
        throw new Error(data.error);
      }

      // Update job with results
      await supabase
        .from('ai_generation_jobs')
        .update({ 
          status: 'completed', 
          output_data: data.content,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      setProgressState('complete');
      return data.content;
    },
    onSuccess: (content) => {
      setGeneratedContent(content);
      toast.success('Content generated! Review before approving.');
    },
    onError: (error: Error) => {
      console.error('Generation error:', error);
      setProgressState('error');
      setErrorMessage(error.message);
      
      // Show appropriate toast based on error type
      if (error.message.includes('session') || error.message.includes('sign in')) {
        toast.error('Session expired. Please refresh the page and sign in again.');
      } else {
        toast.error(`Generation failed: ${error.message}`);
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!generatedContent || !jobId) throw new Error('No content to approve');
      
      setProgressState('saving');
      
      // Handle both array and object formats from AI
      let contentArray: any[];
      
      if (Array.isArray(generatedContent)) {
        contentArray = generatedContent;
      } else if (generatedContent.items && Array.isArray(generatedContent.items)) {
        contentArray = generatedContent.items;
      } else if (generatedContent.questions && Array.isArray(generatedContent.questions)) {
        contentArray = generatedContent.questions;
      } else if (generatedContent.flashcards && Array.isArray(generatedContent.flashcards)) {
        contentArray = generatedContent.flashcards;
      } else if (generatedContent.cases && Array.isArray(generatedContent.cases)) {
        contentArray = generatedContent.cases;
      } else if (generatedContent.essays && Array.isArray(generatedContent.essays)) {
        contentArray = generatedContent.essays;
      } else if (generatedContent.stem || generatedContent.front || generatedContent.title || generatedContent.question) {
        // Single item object - wrap in array
        contentArray = [generatedContent];
      } else {
        throw new Error('Invalid content format - expected array of items or single item');
      }
      
      if (contentArray.length === 0) {
        throw new Error('No content items to approve');
      }

      // Insert approved content into production tables based on content_type
      if (contentType === 'mcq') {
        const mcqsToInsert = contentArray.map((item, idx) => ({
          module_id: moduleId,
          chapter_id: chapterId || null,
          stem: item.stem,
          choices: item.choices,
          correct_key: item.correct_key,
          difficulty: item.difficulty || 'medium',
          explanation: item.explanation || null,
          display_order: idx,
          created_by: user?.id,
          is_deleted: false,
        }));

        const { error: mcqError } = await supabase
          .from('mcqs')
          .insert(mcqsToInsert);

        if (mcqError) throw mcqError;
      } else if (contentType === 'flashcard') {
        // Flashcards are stored in study_resources table
        if (!chapterId) {
          throw new Error('Chapter is required for flashcards');
        }
        
        const flashcardsToInsert = contentArray.map((item, idx) => ({
          module_id: moduleId,
          chapter_id: chapterId,
          resource_type: 'flashcard' as const,
          title: (item.front?.substring(0, 50) || 'Flashcard') as string,
          content: { front: item.front, back: item.back },
          display_order: idx,
          created_by: user?.id,
          is_deleted: false,
        }));

        const { error: flashcardError } = await supabase
          .from('study_resources')
          .insert(flashcardsToInsert);

        if (flashcardError) throw flashcardError;
      } else if (contentType === 'case_scenario') {
        const casesToInsert = contentArray.map((item, idx) => ({
          module_id: moduleId,
          chapter_id: chapterId || null,
          title: item.title,
          case_history: item.case_history,
          case_questions: item.case_questions,
          model_answer: item.model_answer,
          display_order: idx,
          created_by: user?.id,
          is_deleted: false,
        }));

        const { error: caseError } = await supabase
          .from('case_scenarios')
          .insert(casesToInsert);

        if (caseError) throw caseError;
      } else if (contentType === 'essay') {
        const essaysToInsert = contentArray.map((item, idx) => ({
          module_id: moduleId,
          chapter_id: chapterId || null,
          title: item.title,
          question: item.question,
          model_answer: item.model_answer || null,
          keywords: item.keywords || null,
          display_order: idx,
          created_by: user?.id,
          is_deleted: false,
        }));

        const { error: essayError } = await supabase
          .from('essays')
          .insert(essaysToInsert);

        if (essayError) throw essayError;
      }

      // Update job status
      const { error } = await supabase
        .from('ai_generation_jobs')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', jobId);

      if (error) throw error;

      setProgressState('complete');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_generation_jobs'] });
      // Invalidate MCQ queries with correct key structure
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', moduleId] });
      if (chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', chapterId] });
      }
      // Flashcards are stored in study_resources
      queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['study-resources', 'module', moduleId] });
      // Case scenarios and essays
      queryClient.invalidateQueries({ queryKey: ['case-scenarios', 'chapter', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['case-scenarios', 'module', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-essays', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
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

              {/* Content Type */}
              <div className="space-y-2">
                <Label>Content Type *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {CONTENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setContentType(type.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        contentType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <type.icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
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
                    Target Chapter {contentType === 'flashcard' ? '*' : '(Optional)'}
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

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Number of Items</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Maximum 20 items per generation</p>
              </div>

              {/* Additional Instructions */}
              <div className="space-y-2">
                <Label>Additional Instructions (Optional)</Label>
                <Textarea
                  placeholder="e.g., Focus on pharmacology topics, include clinical scenarios..."
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
              </div>
              
              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <div className="space-y-3">
                    {Array.isArray(generatedContent) ? generatedContent.map((item, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <Badge className="mb-2">{contentType.toUpperCase()} #{idx + 1}</Badge>
                          <pre className="text-sm whitespace-pre-wrap">
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )) : (
                      <Card>
                        <CardContent className="p-4">
                          <pre className="text-sm whitespace-pre-wrap">
                            {JSON.stringify(generatedContent, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
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
              disabled={!selectedDocId || !moduleId || generateMutation.isPending || (contentType === 'flashcard' && !chapterId)}
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
