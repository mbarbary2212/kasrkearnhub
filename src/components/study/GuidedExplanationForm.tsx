import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ClipboardCheck } from 'lucide-react';
import { GuidedExplanationContent, ConceptCheckRubric } from '@/hooks/useStudyResources';
import { parseConcepts, formatConcepts } from '@/lib/rubricMarking';
import { cn } from '@/lib/utils';

interface GuidedExplanationFormProps {
  content: GuidedExplanationContent;
  onChange: (content: GuidedExplanationContent) => void;
}

export function GuidedExplanationForm({ content, onChange }: GuidedExplanationFormProps) {
  const questions = content.guided_questions || [];
  const keyTakeaways = content.key_takeaways || [''];
  const [openRubrics, setOpenRubrics] = useState<Record<number, boolean>>({});

  const updateField = (field: keyof GuidedExplanationContent, value: any) => {
    onChange({ ...content, [field]: value });
  };

  const addQuestion = () => {
    onChange({
      ...content,
      guided_questions: [
        ...questions,
        { question: '', hint: '', reveal_answer: '' }
      ],
    });
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    onChange({
      ...content,
      guided_questions: questions.filter((_, i) => i !== index),
    });
  };

  const updateQuestion = (
    index: number,
    field: 'question' | 'hint' | 'reveal_answer',
    value: string
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    onChange({ ...content, guided_questions: newQuestions });
  };

  const updateQuestionRubric = (index: number, rubric: ConceptCheckRubric | undefined) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], rubric };
    onChange({ ...content, guided_questions: newQuestions });
  };

  const toggleRubric = (index: number) => {
    setOpenRubrics(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const addTakeaway = () => {
    onChange({
      ...content,
      key_takeaways: [...keyTakeaways, ''],
    });
  };

  const removeTakeaway = (index: number) => {
    if (keyTakeaways.length <= 1) return;
    onChange({
      ...content,
      key_takeaways: keyTakeaways.filter((_, i) => i !== index),
    });
  };

  const updateTakeaway = (index: number, value: string) => {
    const newTakeaways = [...keyTakeaways];
    newTakeaways[index] = value;
    onChange({ ...content, key_takeaways: newTakeaways });
  };

  return (
    <div className="space-y-6">
      {/* Topic */}
      <div className="space-y-2">
        <Label htmlFor="topic">Topic</Label>
        <Input
          id="topic"
          value={content.topic || ''}
          onChange={(e) => updateField('topic', e.target.value)}
          placeholder="Main topic or concept being explained"
        />
      </div>

      {/* Introduction */}
      <div className="space-y-2">
        <Label htmlFor="introduction">Introduction</Label>
        <Textarea
          id="introduction"
          value={content.introduction || ''}
          onChange={(e) => updateField('introduction', e.target.value)}
          placeholder="Set the context for the guided discovery..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          This introduces the topic and prepares the student for guided questioning.
        </p>
      </div>

      {/* Guided Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Guided Questions (Socratic Method)</Label>
          <Button size="sm" variant="outline" onClick={addQuestion}>
            <Plus className="w-3 h-3 mr-1" />
            Add Question
          </Button>
        </div>
        
        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {q.rubric && (
                      <Badge variant="secondary" className="text-[10px]">
                        <ClipboardCheck className="w-3 h-3 mr-1" />
                        Rubric
                      </Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Question</Label>
                  <Textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                    placeholder='e.g., "What would happen if insulin levels dropped suddenly?"'
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Hint (optional)</Label>
                  <Input
                    value={q.hint || ''}
                    onChange={(e) => updateQuestion(index, 'hint', e.target.value)}
                    placeholder="Optional hint to guide thinking..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Answer to Reveal</Label>
                  <Textarea
                    value={q.reveal_answer}
                    onChange={(e) => updateQuestion(index, 'reveal_answer', e.target.value)}
                    placeholder="The answer that will be revealed after thinking..."
                    rows={3}
                  />
                </div>

                {/* Rubric Editor */}
                <Collapsible open={openRubrics[index]} onOpenChange={() => toggleRubric(index)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-1">
                        <ClipboardCheck className="w-3 h-3" />
                        Practice Rubric (for Concept Check)
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        openRubrics[index] && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3">
                    <RubricEditor
                      rubric={q.rubric}
                      onChange={(rubric) => updateQuestionRubric(index, rubric)}
                      revealAnswer={q.reveal_answer}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>

        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least one guided question to help students discover the answer.
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={content.summary || ''}
          onChange={(e) => updateField('summary', e.target.value)}
          placeholder="Summary shown after completing all questions..."
          rows={3}
        />
      </div>

      {/* Key Takeaways */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Key Takeaways</Label>
          <Button size="sm" variant="outline" onClick={addTakeaway}>
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {keyTakeaways.map((takeaway, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-primary mt-2">•</span>
              <Input
                value={takeaway}
                onChange={(e) => updateTakeaway(index, e.target.value)}
                placeholder="Key point to remember..."
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeTakeaway(index)}
                disabled={keyTakeaways.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Rubric Editor Sub-component
interface RubricEditorProps {
  rubric?: ConceptCheckRubric;
  onChange: (rubric: ConceptCheckRubric | undefined) => void;
  revealAnswer: string;
}

function RubricEditor({ rubric, onChange, revealAnswer }: RubricEditorProps) {
  const [requiredText, setRequiredText] = useState(
    rubric?.required_concepts ? formatConcepts(rubric.required_concepts) : ''
  );
  const [optionalText, setOptionalText] = useState(
    rubric?.optional_concepts ? formatConcepts(rubric.optional_concepts) : ''
  );
  const [threshold, setThreshold] = useState(
    rubric?.pass_threshold ? Math.round(rubric.pass_threshold * 100) : 60
  );

  const hasRubric = !!rubric;

  const handleRequiredChange = (text: string) => {
    setRequiredText(text);
    updateRubric(text, optionalText, threshold);
  };

  const handleOptionalChange = (text: string) => {
    setOptionalText(text);
    updateRubric(requiredText, text, threshold);
  };

  const handleThresholdChange = (value: number[]) => {
    const newThreshold = value[0];
    setThreshold(newThreshold);
    updateRubric(requiredText, optionalText, newThreshold);
  };

  const updateRubric = (required: string, optional: string, thresh: number) => {
    const requiredConcepts = parseConcepts(required);
    const optionalConcepts = parseConcepts(optional);
    
    if (requiredConcepts.length === 0) {
      onChange(undefined);
      return;
    }

    onChange({
      required_concepts: requiredConcepts,
      optional_concepts: optionalConcepts,
      pass_threshold: thresh / 100,
    });
  };

  const handleEnableRubric = () => {
    // Auto-extract concepts from reveal_answer
    const words = revealAnswer
      .split(/[\s,.:;!?]+/)
      .filter(w => w.length > 4)
      .slice(0, 5);
    
    const suggestedConcepts = words.join(', ');
    setRequiredText(suggestedConcepts);
    
    onChange({
      required_concepts: parseConcepts(suggestedConcepts),
      optional_concepts: [],
      pass_threshold: 0.6,
    });
  };

  const handleDisableRubric = () => {
    setRequiredText('');
    setOptionalText('');
    setThreshold(60);
    onChange(undefined);
  };

  if (!hasRubric) {
    return (
      <div className="text-center py-4 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground mb-2">
          Enable rubric to use this question in Concept Check practice
        </p>
        <Button size="sm" variant="outline" onClick={handleEnableRubric}>
          <Plus className="w-3 h-3 mr-1" />
          Add Rubric
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Grading Rubric</span>
        <Button size="sm" variant="ghost" className="text-xs h-6" onClick={handleDisableRubric}>
          Remove
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Required Concepts (comma or newline separated)</Label>
        <Textarea
          value={requiredText}
          onChange={(e) => handleRequiredChange(e.target.value)}
          placeholder="key concept 1, key concept 2, key concept 3..."
          rows={2}
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Students must mention these concepts to pass
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Optional Concepts (bonus)</Label>
        <Input
          value={optionalText}
          onChange={(e) => handleOptionalChange(e.target.value)}
          placeholder="bonus concept 1, bonus concept 2..."
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Pass Threshold</Label>
          <Badge variant="outline" className="text-xs">{threshold}%</Badge>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={handleThresholdChange}
          min={40}
          max={100}
          step={10}
          className="py-2"
        />
        <p className="text-[10px] text-muted-foreground">
          Percentage of required concepts needed to pass
        </p>
      </div>
    </div>
  );
}
