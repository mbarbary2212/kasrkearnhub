import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { GuidedExplanationContent } from '@/hooks/useStudyResources';

interface GuidedExplanationFormProps {
  content: GuidedExplanationContent;
  onChange: (content: GuidedExplanationContent) => void;
}

export function GuidedExplanationForm({ content, onChange }: GuidedExplanationFormProps) {
  const questions = content.guided_questions || [];
  const keyTakeaways = content.key_takeaways || [''];

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
