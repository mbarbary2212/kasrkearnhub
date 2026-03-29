import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateCaseScenario } from '@/hooks/useCaseScenarios';
import type { CaseScenario, CaseDifficulty } from '@/types/caseScenario';

interface Props {
  caseData: CaseScenario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuestionRow {
  id?: string;
  question_text: string;
  model_answer: string;
  explanation: string;
}

export function CaseScenarioEditModal({ caseData, open, onOpenChange }: Props) {
  const updateCase = useUpdateCaseScenario();
  const [stem, setStem] = useState('');
  const [difficulty, setDifficulty] = useState<CaseDifficulty>('moderate');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  useEffect(() => {
    if (caseData) {
      setStem(caseData.stem);
      setDifficulty(caseData.difficulty);
      setQuestions(
        (caseData.questions || [])
          .sort((a, b) => a.display_order - b.display_order)
          .map(q => ({
            id: q.id,
            question_text: q.question_text,
            model_answer: q.model_answer || '',
            explanation: q.explanation || '',
          }))
      );
    }
  }, [caseData]);

  const addQuestion = () => {
    if (questions.length >= 3) return;
    setQuestions(prev => [...prev, { question_text: '', model_answer: '', explanation: '' }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof QuestionRow, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleSave = async () => {
    if (!caseData) return;
    if (!stem.trim()) { toast.error('Case stem is required'); return; }
    if (!questions[0]?.question_text.trim()) { toast.error('At least one question is required'); return; }

    try {
      await updateCase.mutateAsync({
        id: caseData.id,
        data: { stem, difficulty },
        questions: questions.map((q, idx) => ({
          id: q.id,
          question_text: q.question_text,
          model_answer: q.model_answer || null,
          explanation: q.explanation || null,
          max_marks: 5,
          display_order: idx + 1,
        })),
      });
      toast.success('Case scenario updated');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Case Scenario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={v => setDifficulty(v as CaseDifficulty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="difficult">Difficult</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Case Stem</Label>
            <Textarea value={stem} onChange={e => setStem(e.target.value)} rows={4} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Questions ({questions.length}/3)</Label>
              {questions.length < 3 && (
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-3 h-3 mr-1" /> Add Question
                </Button>
              )}
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Question {idx + 1}</span>
                  {questions.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Question text"
                  value={q.question_text}
                  onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                />
                <Textarea
                  placeholder="Model answer"
                  value={q.model_answer}
                  onChange={e => updateQuestion(idx, 'model_answer', e.target.value)}
                  rows={2}
                />
                <Input
                  placeholder="Explanation / teaching points (optional)"
                  value={q.explanation}
                  onChange={e => updateQuestion(idx, 'explanation', e.target.value)}
                />
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={updateCase.isPending} className="w-full">
            {updateCase.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
