import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  Check,
  Eye,
  Edit2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CaseLevel } from '@/types/clinicalCase';
import { useCreateClinicalCase } from '@/hooks/useClinicalCases';
import { useQueryClient } from '@tanstack/react-query';

interface ClinicalCaseAIGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleName?: string;
  chapterId?: string;
  topicId?: string;
  chapterTitle?: string;
  onCaseCreated?: (caseId: string) => void;
}

interface GeneratedCaseData {
  title: string;
  intro_text: string;
  learning_objectives: string;
  estimated_minutes: number;
  tags: string[];
}

export function ClinicalCaseAIGenerateModal({
  open,
  onOpenChange,
  moduleId,
  moduleName,
  chapterId,
  topicId,
  chapterTitle,
  onCaseCreated,
}: ClinicalCaseAIGenerateModalProps) {
  const queryClient = useQueryClient();
  const createCase = useCreateClinicalCase();

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<CaseLevel>('intermediate');
  const [scenarioType, setScenarioType] = useState('diagnosis');
  const [maxTurns, setMaxTurns] = useState(10);
  const [learningObjectives, setLearningObjectives] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCase, setGeneratedCase] = useState<GeneratedCaseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const hasValuableContent = !!generatedCase || isGenerating;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedCase(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-vp-case', {
        body: {
          topic: topic.trim(),
          chapterTitle,
          moduleName,
          difficulty,
          scenarioType,
          stageCount: 0,
          learningObjectives: learningObjectives.trim() || undefined,
          aiDriven: true,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.generatedCase) {
        setGeneratedCase({
          title: data.generatedCase.title,
          intro_text: data.generatedCase.intro_text,
          learning_objectives: learningObjectives.trim() || data.generatedCase.learning_objectives || '',
          estimated_minutes: data.generatedCase.estimated_minutes || 15,
          tags: data.generatedCase.tags || [],
        });
        toast.success('Case generated! Review and approve below.');
      } else {
        throw new Error('No case data in response');
      }
    } catch (err) {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate case';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndCreate = async () => {
    if (!generatedCase) return;

    setIsCreating(true);
    try {
      const caseResult = await createCase.mutateAsync({
        title: generatedCase.title,
        intro_text: generatedCase.intro_text,
        module_id: moduleId,
        chapter_id: chapterId,
        topic_id: topicId,
        level: difficulty,
        estimated_minutes: generatedCase.estimated_minutes,
        tags: generatedCase.tags,
        is_published: false,
        learning_objectives: generatedCase.learning_objectives,
        max_turns: maxTurns,
      });

      await queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });

      toast.success(`AI Case "${generatedCase.title}" created!`);
      resetModal();
      onOpenChange(false);
      onCaseCreated?.(caseResult.id);
    } catch (err) {
      console.error('Create error:', err);
      toast.error('Failed to create case');
    } finally {
      setIsCreating(false);
    }
  };

  const resetModal = () => {
    setTopic('');
    setDifficulty('intermediate');
    setScenarioType('diagnosis');
    setMaxTurns(10);
    setLearningObjectives('');
    setGeneratedCase(null);
    setError(null);
  };

  const attemptClose = () => {
    if (hasValuableContent) {
      setShowDiscardConfirm(true);
    } else {
      resetModal();
      onOpenChange(false);
    }
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    resetModal();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-3xl h-[80vh] flex flex-col overflow-hidden p-0"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            attemptClose();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="shrink-0 px-6 pt-6 pb-4 border-b bg-background">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate AI Case
              </DialogTitle>
              <DialogDescription>
                AI will generate a case scenario. The AI examiner will dynamically run the case — no stages needed.
              </DialogDescription>
            </DialogHeader>
            {/* Custom close button that goes through attemptClose */}
            <button
              onClick={attemptClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            {!generatedCase ? (
              <div className="space-y-4 pr-4 pb-4 pt-2">
                {(moduleName || chapterTitle) && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <span className="text-muted-foreground">Generating for: </span>
                    {moduleName && <Badge variant="outline" className="mr-1">{moduleName}</Badge>}
                    {chapterTitle && <Badge variant="secondary">{chapterTitle}</Badge>}
                  </div>
                )}

                <div>
                  <Label htmlFor="topic">Topic / Clinical Scenario *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Breast lump in a 45-year-old woman"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={difficulty} onValueChange={(v) => setDifficulty(v as CaseLevel)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Scenario Type</Label>
                    <Select value={scenarioType} onValueChange={setScenarioType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="counseling">Counseling</SelectItem>
                        <SelectItem value="complications">Complications</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Max Turns</Label>
                    <Input
                      type="number"
                      min={5}
                      max={20}
                      value={maxTurns}
                      onChange={(e) => setMaxTurns(parseInt(e.target.value) || 10)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="objectives">Learning Objectives (optional)</Label>
                  <Textarea
                    id="objectives"
                    value={learningObjectives}
                    onChange={(e) => setLearningObjectives(e.target.value)}
                    placeholder="e.g., Students should learn to apply triple assessment, recognize BI-RADS classifications..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive">{error}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 pr-4 pb-4 pt-2">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Case generated! Review below and click "Approve & Create" to save.
                  </span>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {generatedCase.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{generatedCase.intro_text}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">{difficulty}</Badge>
                      <Badge variant="secondary">~{generatedCase.estimated_minutes} min</Badge>
                      <Badge variant="secondary">{maxTurns} turns</Badge>
                    </div>
                    {generatedCase.learning_objectives && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium mb-1">Learning Objectives</p>
                          <p className="text-xs text-muted-foreground">{generatedCase.learning_objectives}</p>
                        </div>
                      </>
                    )}
                    {generatedCase.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {generatedCase.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="shrink-0 flex justify-between gap-2 px-6 py-4 border-t bg-background z-10">
            {!generatedCase ? (
              <>
                <Button variant="outline" onClick={attemptClose}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}>
                  {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isGenerating ? 'Generating...' : 'Generate Case'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setGeneratedCase(null)} disabled={isCreating}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={attemptClose} disabled={isCreating}>
                    Discard
                  </Button>
                  <Button onClick={handleApproveAndCreate} disabled={isCreating}>
                    {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Check className="w-4 h-4 mr-1" />
                    Approve & Create
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard generated case?</AlertDialogTitle>
            <AlertDialogDescription>
              {generatedCase
                ? `The generated case "${generatedCase.title}" will be lost. This action cannot be undone.`
                : 'A case is currently being generated. Closing now will lose any progress.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
