import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  HelpCircle,
  CheckSquare,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VPStageType, VPLevel, VPRubric } from '@/types/virtualPatient';
import { useCreateVirtualPatientCase, useCreateVirtualPatientStage } from '@/hooks/useVirtualPatient';
import { useQueryClient } from '@tanstack/react-query';

interface VPAIGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleName?: string;
  chapterId?: string;
  chapterTitle?: string;
  onCaseCreated?: (caseId: string) => void;
}

interface GeneratedStage {
  stage_order: number;
  stage_type: VPStageType;
  prompt: string;
  patient_info: string | null;
  choices: { key: string; text: string }[];
  correct_answer: string | string[];
  explanation: string | null;
  teaching_points: string[];
  rubric: VPRubric | null;
}

interface GeneratedCase {
  title: string;
  intro_text: string;
  estimated_minutes: number;
  tags: string[];
  stages: GeneratedStage[];
}

const stageTypeIcons: Record<VPStageType, typeof HelpCircle> = {
  mcq: HelpCircle,
  multi_select: CheckSquare,
  short_answer: MessageSquare,
};

const stageTypeLabels: Record<VPStageType, string> = {
  mcq: 'Single Choice',
  multi_select: 'Multi-select',
  short_answer: 'Short Answer',
};

export function VPAIGenerateModal({
  open,
  onOpenChange,
  moduleId,
  moduleName,
  chapterId,
  chapterTitle,
  onCaseCreated,
}: VPAIGenerateModalProps) {
  const queryClient = useQueryClient();
  const createCase = useCreateVirtualPatientCase();
  const createStage = useCreateVirtualPatientStage();

  // Generation parameters
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<VPLevel>('intermediate');
  const [scenarioType, setScenarioType] = useState('diagnosis');
  const [stageCount, setStageCount] = useState(5);
  const [learningObjectives, setLearningObjectives] = useState('');

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCase, setGeneratedCase] = useState<GeneratedCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
          stageCount,
          learningObjectives: learningObjectives.trim() || undefined,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.generatedCase) {
        setGeneratedCase(data.generatedCase);
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
      // Create the case
      const caseResult = await createCase.mutateAsync({
        title: generatedCase.title,
        intro_text: generatedCase.intro_text,
        module_id: moduleId,
        chapter_id: chapterId,
        level: difficulty,
        estimated_minutes: generatedCase.estimated_minutes || 10,
        tags: generatedCase.tags || [],
        is_published: false, // Always draft
      });

      // Create all stages
      for (const stage of generatedCase.stages) {
        await createStage.mutateAsync({
          caseId: caseResult.id,
          data: {
            stage_order: stage.stage_order,
            stage_type: stage.stage_type,
            prompt: stage.prompt,
            patient_info: stage.patient_info || undefined,
            choices: stage.choices || [],
            correct_answer: stage.correct_answer,
            explanation: stage.explanation || undefined,
            teaching_points: stage.teaching_points || [],
            rubric: stage.rubric,
          },
        });
      }

      // Force refresh all caches
      await queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] });
      await queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', caseResult.id] });

      toast.success(`Case "${generatedCase.title}" created with ${generatedCase.stages.length} stages!`);
      
      // Reset and close
      resetModal();
      onOpenChange(false);
      
      if (onCaseCreated) {
        onCaseCreated(caseResult.id);
      }
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
    setStageCount(5);
    setLearningObjectives('');
    setGeneratedCase(null);
    setError(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Case with AI
            </DialogTitle>
            <DialogDescription>
              AI will generate a draft case for your review. You must approve before it's created.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6">
          {!generatedCase ? (
            // Generation Form
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4 pb-4">
                {/* Context info */}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={(v) => setDifficulty(v as VPLevel)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
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
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="counseling">Counseling</SelectItem>
                        <SelectItem value="complications">Complications</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Number of Stages: {stageCount}</Label>
                  <input
                    type="range"
                    min={3}
                    max={8}
                    value={stageCount}
                    onChange={(e) => setStageCount(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3 (Quick)</span>
                    <span>8 (Comprehensive)</span>
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
            </ScrollArea>
          ) : (
            // Preview Generated Case
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4 pb-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Case generated successfully! Review below and click "Approve & Create" to save.
                  </span>
                </div>

                {/* Case Header */}
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
                      <Badge variant="secondary">{generatedCase.stages.length} stages</Badge>
                    </div>
                    {generatedCase.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {generatedCase.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Separator />

                {/* Stages Preview */}
                <div>
                  <h4 className="font-medium mb-3">Stages Preview</h4>
                  <div className="space-y-3">
                    {generatedCase.stages.map((stage, index) => {
                      const Icon = stageTypeIcons[stage.stage_type];
                      return (
                        <Card key={index} className="bg-muted/30">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className="shrink-0">
                                {stage.stage_order}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {stageTypeLabels[stage.stage_type]}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">{stage.prompt}</p>
                                {stage.patient_info && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    Context: {stage.patient_info}
                                  </p>
                                )}
                                {stage.stage_type !== 'short_answer' && stage.choices.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {stage.choices.map((choice) => (
                                      <div key={choice.key} className="flex items-center gap-2 text-xs">
                                        <Badge 
                                          variant={
                                            (Array.isArray(stage.correct_answer) 
                                              ? stage.correct_answer.includes(choice.key) 
                                              : stage.correct_answer === choice.key)
                                              ? 'default' 
                                              : 'outline'
                                          }
                                          className="text-xs"
                                        >
                                          {choice.key}
                                        </Badge>
                                        <span>{choice.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {stage.stage_type === 'short_answer' && stage.rubric && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <span className="text-green-600">Required concepts:</span>{' '}
                                    {stage.rubric.required_concepts.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 flex justify-between gap-2 px-6 py-4 border-t bg-background z-10">
          {!generatedCase ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}>
                {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Case'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setGeneratedCase(null)}
                disabled={isCreating}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Regenerate
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => handleClose(false)}
                  disabled={isCreating}
                >
                  Discard
                </Button>
                <Button 
                  onClick={handleApproveAndCreate}
                  disabled={isCreating}
                  className="bg-green-600 hover:bg-green-700"
                >
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
  );
}
