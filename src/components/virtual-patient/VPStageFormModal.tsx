import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, X, Trash2, HelpCircle } from 'lucide-react';
import { VPStage, VPStageFormData, VPStageType, VPChoice, VPRubric } from '@/types/virtualPatient';
import { useCreateVirtualPatientStage, useUpdateVirtualPatientStage } from '@/hooks/useVirtualPatient';
import { toast } from 'sonner';
import { parseConcepts } from '@/lib/rubricMarking';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VPStageFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  stageOrder: number;
  stage?: VPStage | null;
}

const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function VPStageFormModal({
  open,
  onOpenChange,
  caseId,
  stageOrder,
  stage,
}: VPStageFormModalProps) {
  const isEditing = !!stage;
  const queryClient = useQueryClient();

  const [stageType, setStageType] = useState<VPStageType>('mcq');
  const [prompt, setPrompt] = useState('');
  const [patientInfo, setPatientInfo] = useState('');
  const [choices, setChoices] = useState<VPChoice[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('A');
  const [explanation, setExplanation] = useState('');
  const [teachingPoints, setTeachingPoints] = useState<string[]>([]);
  const [teachingPointInput, setTeachingPointInput] = useState('');
  // Rubric fields for short_answer
  const [rubricRequired, setRubricRequired] = useState('');
  const [rubricOptional, setRubricOptional] = useState('');

  const createStage = useCreateVirtualPatientStage();
  const updateStage = useUpdateVirtualPatientStage();

  useEffect(() => {
    if (stage) {
      setStageType(stage.stage_type);
      setPrompt(stage.prompt);
      setPatientInfo(stage.patient_info || '');
      setChoices(stage.choices.length > 0 ? stage.choices : [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ]);
      setCorrectAnswer(stage.correct_answer);
      setExplanation(stage.explanation || '');
      setTeachingPoints(stage.teaching_points || []);
      // Load rubric
      if (stage.rubric) {
        setRubricRequired(stage.rubric.required_concepts.join('\n'));
        setRubricOptional(stage.rubric.optional_concepts.join('\n'));
      } else {
        setRubricRequired('');
        setRubricOptional('');
      }
    } else {
      resetForm();
    }
  }, [stage, open]);

  const resetForm = () => {
    setStageType('mcq');
    setPrompt('');
    setPatientInfo('');
    setChoices([
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
    ]);
    setCorrectAnswer('A');
    setExplanation('');
    setTeachingPoints([]);
    setTeachingPointInput('');
    setRubricRequired('');
    setRubricOptional('');
  };


  const handleStageTypeChange = (type: VPStageType) => {
    setStageType(type);
    if (type === 'mcq') {
      setCorrectAnswer('A');
    } else if (type === 'multi_select') {
      setCorrectAnswer([]);
    } else {
      setCorrectAnswer('');
    }
  };

  const addChoice = () => {
    if (choices.length < CHOICE_KEYS.length) {
      setChoices([...choices, { key: CHOICE_KEYS[choices.length], text: '' }]);
    }
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      const newChoices = choices.filter((_, i) => i !== index).map((c, i) => ({
        key: CHOICE_KEYS[i],
        text: c.text,
      }));
      setChoices(newChoices);
      
      // Fix correct answer if necessary
      if (stageType === 'mcq' && !newChoices.find(c => c.key === correctAnswer)) {
        setCorrectAnswer(newChoices[0]?.key || 'A');
      } else if (stageType === 'multi_select') {
        const newCorrect = (correctAnswer as string[]).filter(k =>
          newChoices.find(c => c.key === k)
        );
        setCorrectAnswer(newCorrect);
      }
    }
  };

  const updateChoice = (index: number, text: string) => {
    const newChoices = [...choices];
    newChoices[index] = { ...newChoices[index], text };
    setChoices(newChoices);
  };

  const toggleMultiSelectAnswer = (key: string) => {
    const current = correctAnswer as string[];
    if (current.includes(key)) {
      setCorrectAnswer(current.filter(k => k !== key));
    } else {
      setCorrectAnswer([...current, key]);
    }
  };

  const addTeachingPoint = () => {
    const trimmed = teachingPointInput.trim();
    if (trimmed) {
      setTeachingPoints([...teachingPoints, trimmed]);
      setTeachingPointInput('');
    }
  };

  const removeTeachingPoint = (index: number) => {
    setTeachingPoints(teachingPoints.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (stageType !== 'short_answer') {
      if (choices.some(c => !c.text.trim())) {
        toast.error('Please fill in all choices');
        return;
      }
      if (stageType === 'multi_select' && (correctAnswer as string[]).length === 0) {
        toast.error('Please select at least one correct answer');
        return;
      }
    }

    // Build rubric for short_answer
    let rubric: VPRubric | null = null;
    if (stageType === 'short_answer') {
      const requiredConcepts = parseConcepts(rubricRequired);
      const optionalConcepts = parseConcepts(rubricOptional);
      if (requiredConcepts.length > 0 || optionalConcepts.length > 0) {
        rubric = {
          required_concepts: requiredConcepts,
          optional_concepts: optionalConcepts,
        };
      }
    }

    const formData: VPStageFormData = {
      stage_order: isEditing ? stage!.stage_order : stageOrder,
      stage_type: stageType,
      prompt: prompt.trim(),
      patient_info: patientInfo.trim() || undefined,
      choices: stageType === 'short_answer' ? [] : choices.map(c => ({ key: c.key, text: c.text.trim() })),
      correct_answer: correctAnswer,
      explanation: explanation.trim() || undefined,
      teaching_points: teachingPoints,
      rubric,
    };

    try {
      if (isEditing && stage) {
        await updateStage.mutateAsync({ id: stage.id, caseId, data: formData });
        toast.success('Stage updated successfully');
      } else {
        await createStage.mutateAsync({ caseId, data: formData });
        toast.success('Stage added successfully');
      }
      // Force immediate refetch
      await queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', caseId] });
      await queryClient.invalidateQueries({ queryKey: ['virtual-patient-stages', caseId] });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save stage:', error);
      toast.error('Failed to save stage');
    }
  };

  const isLoading = createStage.isPending || updateStage.isPending;
  const isValid = prompt.trim() && (
    stageType === 'short_answer' ||
    (choices.every(c => c.text.trim()) && (
      stageType === 'mcq' ? correctAnswer : (correctAnswer as string[]).length > 0
    ))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit' : 'Add'} Stage {isEditing ? stage?.stage_order : stageOrder}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 pr-4 pb-4">
            {/* Stage Type */}
            <div>
              <Label>Question Type</Label>
              <Select value={stageType} onValueChange={(v) => handleStageTypeChange(v as VPStageType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Single Choice (MCQ)</SelectItem>
                  <SelectItem value="multi_select">Multiple Choice (Multi-select)</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Patient Info (optional context) */}
            <div>
              <Label htmlFor="patient-info">Additional Patient Information (optional)</Label>
              <Textarea
                id="patient-info"
                value={patientInfo}
                onChange={(e) => setPatientInfo(e.target.value)}
                placeholder="Any new patient data revealed at this stage..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Prompt */}
            <div>
              <Label htmlFor="prompt">Question/Prompt *</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What is your next step?"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Choices (for MCQ and Multi-select) */}
            {stageType !== 'short_answer' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Choices *</Label>
                  {choices.length < CHOICE_KEYS.length && (
                    <Button type="button" variant="outline" size="sm" onClick={addChoice}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Choice
                    </Button>
                  )}
                </div>
                
                {choices.map((choice, index) => (
                  <div key={choice.key} className="flex items-start gap-2">
                    {stageType === 'mcq' ? (
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={correctAnswer === choice.key}
                        onChange={() => setCorrectAnswer(choice.key)}
                        className="mt-3"
                      />
                    ) : (
                      <Checkbox
                        checked={(correctAnswer as string[]).includes(choice.key)}
                        onCheckedChange={() => toggleMultiSelectAnswer(choice.key)}
                        className="mt-3"
                      />
                    )}
                    <Badge variant="outline" className="mt-2 shrink-0">{choice.key}</Badge>
                    <Input
                      value={choice.text}
                      onChange={(e) => updateChoice(index, e.target.value)}
                      placeholder={`Option ${choice.key}`}
                      className="flex-1"
                    />
                    {choices.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChoice(index)}
                        className="shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {stageType === 'mcq' ? 'Select the correct answer' : 'Check all correct answers'}
                </p>
              </div>
            )}

            {/* Short Answer Model Answer + Rubric */}
            {stageType === 'short_answer' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="model-answer">Model Answer (for reference)</Label>
                  <Textarea
                    id="model-answer"
                    value={correctAnswer as string}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Expected answer or key points..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                
                <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Rubric-Based Grading</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Students score ≥60% of required concepts to pass. Order doesn't matter, minor typos are tolerated.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div>
                    <Label htmlFor="rubric-required" className="text-xs text-green-700 dark:text-green-400">
                      Required Concepts (one per line)
                    </Label>
                    <Textarea
                      id="rubric-required"
                      value={rubricRequired}
                      onChange={(e) => setRubricRequired(e.target.value)}
                      placeholder="triple assessment&#10;clinical examination&#10;imaging&#10;biopsy"
                      rows={3}
                      className="mt-1 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="rubric-optional" className="text-xs text-blue-700 dark:text-blue-400">
                      Optional Concepts (bonus, one per line)
                    </Label>
                    <Textarea
                      id="rubric-optional"
                      value={rubricOptional}
                      onChange={(e) => setRubricOptional(e.target.value)}
                      placeholder="MDT discussion&#10;patient counseling"
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div>
              <Label htmlFor="explanation">Explanation</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain why this is the correct answer..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Teaching Points */}
            <div>
              <Label>Teaching Points</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={teachingPointInput}
                  onChange={(e) => setTeachingPointInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTeachingPoint())}
                  placeholder="Add teaching point and press Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addTeachingPoint}>
                  Add
                </Button>
              </div>
              {teachingPoints.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {teachingPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm">
                      <span className="flex-1">{point}</span>
                      <button onClick={() => removeTeachingPoint(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Add'} Stage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
