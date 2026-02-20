import { useState, useEffect } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Plus, X, Trash2, HelpCircle, ChevronUp } from 'lucide-react';
import { ClinicalCaseStage, ClinicalCaseStageFormData, CaseStageType, CaseChoice, CaseRubric } from '@/types/clinicalCase';
import { useCreateClinicalCaseStage, useUpdateClinicalCaseStage } from '@/hooks/useClinicalCases';
import { toast } from 'sonner';
import { parseConcepts } from '@/lib/rubricMarking';
import { useQueryClient } from '@tanstack/react-query';

const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface CaseBuilderStageEditorProps {
  caseId: string;
  stageOrder: number;
  stage?: ClinicalCaseStage | null;
  onClose: () => void;
}

export function CaseBuilderStageEditor({
  caseId,
  stageOrder,
  stage,
  onClose,
}: CaseBuilderStageEditorProps) {
  const isEditing = !!stage;
  const queryClient = useQueryClient();

  const [stageType, setStageType] = useState<CaseStageType>('mcq');
  const [prompt, setPrompt] = useState('');
  const [patientInfo, setPatientInfo] = useState('');
  const [choices, setChoices] = useState<CaseChoice[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('A');
  const [explanation, setExplanation] = useState('');
  const [teachingPoints, setTeachingPoints] = useState<string[]>([]);
  const [teachingPointInput, setTeachingPointInput] = useState('');
  const [rubricRequired, setRubricRequired] = useState('');
  const [rubricOptional, setRubricOptional] = useState('');

  const createStage = useCreateClinicalCaseStage();
  const updateStage = useUpdateClinicalCaseStage();

  useEffect(() => {
    if (stage) {
      setStageType(stage.stage_type);
      setPrompt(stage.prompt);
      setPatientInfo(stage.patient_info || '');
      setChoices(stage.choices.length > 0 ? stage.choices : [
        { key: 'A', text: '' }, { key: 'B', text: '' },
        { key: 'C', text: '' }, { key: 'D', text: '' },
      ]);
      setCorrectAnswer(stage.correct_answer);
      setExplanation(stage.explanation || '');
      setTeachingPoints(stage.teaching_points || []);
      if (stage.rubric) {
        setRubricRequired(stage.rubric.required_concepts.join('\n'));
        setRubricOptional(stage.rubric.optional_concepts.join('\n'));
      } else {
        setRubricRequired('');
        setRubricOptional('');
      }
    }
  }, [stage]);

  const handleStageTypeChange = (type: CaseStageType) => {
    setStageType(type);
    if (type === 'mcq') setCorrectAnswer('A');
    else if (type === 'multi_select') setCorrectAnswer([]);
    else setCorrectAnswer('');
  };

  const addChoice = () => {
    if (choices.length < CHOICE_KEYS.length) {
      setChoices([...choices, { key: CHOICE_KEYS[choices.length], text: '' }]);
    }
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      const newChoices = choices.filter((_, i) => i !== index).map((c, i) => ({
        key: CHOICE_KEYS[i], text: c.text,
      }));
      setChoices(newChoices);
      if (stageType === 'mcq' && !newChoices.find(c => c.key === correctAnswer)) {
        setCorrectAnswer(newChoices[0]?.key || 'A');
      } else if (stageType === 'multi_select') {
        setCorrectAnswer((correctAnswer as string[]).filter(k => newChoices.find(c => c.key === k)));
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
    setCorrectAnswer(current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
  };

  const addTeachingPoint = () => {
    const trimmed = teachingPointInput.trim();
    if (trimmed) {
      setTeachingPoints([...teachingPoints, trimmed]);
      setTeachingPointInput('');
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) { toast.error('Please enter a prompt'); return; }

    if (stageType === 'mcq' || stageType === 'multi_select') {
      if (choices.some(c => !c.text.trim())) { toast.error('Please fill in all choices'); return; }
      if (stageType === 'multi_select' && (correctAnswer as string[]).length === 0) {
        toast.error('Please select at least one correct answer'); return;
      }
    }

    let rubric: CaseRubric | null = null;
    if (stageType === 'short_answer') {
      const requiredConcepts = parseConcepts(rubricRequired);
      const optionalConcepts = parseConcepts(rubricOptional);
      if (requiredConcepts.length > 0 || optionalConcepts.length > 0) {
        rubric = { required_concepts: requiredConcepts, optional_concepts: optionalConcepts };
      }
    }

    const formData: ClinicalCaseStageFormData = {
      stage_order: isEditing ? stage!.stage_order : stageOrder,
      stage_type: stageType,
      prompt: prompt.trim(),
      patient_info: patientInfo.trim() || undefined,
      choices: (stageType === 'short_answer' || stageType === 'read_only') ? [] : choices.map(c => ({ key: c.key, text: c.text.trim() })),
      correct_answer: stageType === 'read_only' ? '' : correctAnswer,
      explanation: explanation.trim() || undefined,
      teaching_points: teachingPoints,
      rubric,
    };

    try {
      if (isEditing && stage) {
        await updateStage.mutateAsync({ id: stage.id, caseId, data: formData });
        toast.success('Stage updated');
      } else {
        await createStage.mutateAsync({ caseId, data: formData });
        toast.success('Stage added');
      }
      await queryClient.invalidateQueries({ queryKey: ['clinical-case', caseId] });
      await queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });
      onClose();
    } catch (error) {
      console.error('Failed to save stage:', error);
      toast.error('Failed to save stage');
    }
  };

  const isLoading = createStage.isPending || updateStage.isPending;
  const isValid = prompt.trim() && (
    stageType === 'short_answer' || stageType === 'read_only' ||
    (choices.every(c => c.text.trim()) && (stageType === 'mcq' ? correctAnswer : (correctAnswer as string[]).length > 0))
  );

  return (
    <div className="border rounded-lg bg-muted/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          {isEditing ? `Edit Stage ${stage?.stage_order}` : `Add Stage ${stageOrder}`}
        </h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ChevronUp className="w-4 h-4 mr-1" />
          Collapse
        </Button>
      </div>

      {/* Stage Type */}
      <div>
        <Label>Question Type</Label>
        <Select value={stageType} onValueChange={(v) => handleStageTypeChange(v as CaseStageType)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mcq">Single Choice (MCQ)</SelectItem>
            <SelectItem value="multi_select">Multiple Choice (Multi-select)</SelectItem>
            <SelectItem value="short_answer">Short Answer</SelectItem>
            <SelectItem value="read_only">Read Only (Info)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Patient Info */}
      <div>
        <Label>Additional Patient Information (optional)</Label>
        <Textarea
          value={patientInfo}
          onChange={(e) => setPatientInfo(e.target.value)}
          placeholder="Any new patient data revealed at this stage..."
          rows={2}
          className="mt-1"
        />
      </div>

      {/* Prompt */}
      <div>
        <Label>Question/Prompt *</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What is your next step?"
          rows={3}
          className="mt-1"
        />
      </div>

      {/* Choices */}
      {(stageType === 'mcq' || stageType === 'multi_select') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Choices *</Label>
            {choices.length < CHOICE_KEYS.length && (
              <Button type="button" variant="outline" size="sm" onClick={addChoice}>
                <Plus className="w-4 h-4 mr-1" /> Add Choice
              </Button>
            )}
          </div>
          {choices.map((choice, index) => (
            <div key={choice.key} className="flex items-start gap-2">
              {stageType === 'mcq' ? (
                <input type="radio" name={`correct-${caseId}`} checked={correctAnswer === choice.key}
                  onChange={() => setCorrectAnswer(choice.key)} className="mt-3" />
              ) : (
                <Checkbox checked={(correctAnswer as string[]).includes(choice.key)}
                  onCheckedChange={() => toggleMultiSelectAnswer(choice.key)} className="mt-3" />
              )}
              <Badge variant="outline" className="mt-2 shrink-0">{choice.key}</Badge>
              <Input value={choice.text} onChange={(e) => updateChoice(index, e.target.value)}
                placeholder={`Option ${choice.key}`} className="flex-1" />
              {choices.length > 2 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeChoice(index)} className="shrink-0">
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

      {/* Read Only info */}
      {stageType === 'read_only' && (
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">
            This stage will display the prompt and patient info. Students click "Continue" to proceed.
          </p>
        </div>
      )}

      {/* Short Answer */}
      {stageType === 'short_answer' && (
        <div className="space-y-4">
          <div>
            <Label>Model Answer (for reference)</Label>
            <Textarea value={correctAnswer as string} onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Expected answer or key points..." rows={2} className="mt-1" />
          </div>
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Rubric-Based Grading</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="w-4 h-4 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Students score ≥60% of required concepts to pass.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <Label className="text-xs text-green-700 dark:text-green-400">Required Concepts (one per line)</Label>
              <Textarea value={rubricRequired} onChange={(e) => setRubricRequired(e.target.value)}
                placeholder={"triple assessment\nclinical examination\nimaging\nbiopsy"} rows={3} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-blue-700 dark:text-blue-400">Optional Concepts (bonus, one per line)</Label>
              <Textarea value={rubricOptional} onChange={(e) => setRubricOptional(e.target.value)}
                placeholder={"MDT discussion\npatient counseling"} rows={2} className="mt-1 text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div>
        <Label>Explanation</Label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explain why this is the correct answer..." rows={3} className="mt-1" />
      </div>

      {/* Teaching Points */}
      <div>
        <Label>Teaching Points</Label>
        <div className="flex gap-2 mt-1">
          <Input value={teachingPointInput}
            onChange={(e) => setTeachingPointInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTeachingPoint(); } }}
            placeholder="Add teaching point and press Enter" className="flex-1" />
          <Button type="button" variant="outline" onClick={addTeachingPoint}>Add</Button>
        </div>
        {teachingPoints.length > 0 && (
          <ul className="mt-2 space-y-1">
            {teachingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm">
                <span className="flex-1">{point}</span>
                <button onClick={() => setTeachingPoints(teachingPoints.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!isValid || isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Stage' : 'Add Stage'}
        </Button>
      </div>
    </div>
  );
}
