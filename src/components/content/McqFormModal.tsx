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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateMcq, useUpdateMcq, type Mcq, type McqChoice } from '@/hooks/useMcqs';

interface McqFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string | null;
  mcq?: Mcq;
  isAdmin: boolean;
}

const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;

const defaultChoices: McqChoice[] = CHOICE_KEYS.map((key) => ({ key, text: '' }));

export function McqFormModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  mcq,
  isAdmin,
}: McqFormModalProps) {
  const isEditing = !!mcq;

  const [stem, setStem] = useState('');
  const [choices, setChoices] = useState<McqChoice[]>(defaultChoices);
  const [correctKey, setCorrectKey] = useState<string>('A');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const createMutation = useCreateMcq();
  const updateMutation = useUpdateMcq();

  // Initialize form when editing
  useEffect(() => {
    if (mcq) {
      setStem(mcq.stem);
      setChoices(mcq.choices as McqChoice[]);
      setCorrectKey(mcq.correct_key);
      setExplanation(mcq.explanation || '');
      setDifficulty(mcq.difficulty || 'medium');
    } else {
      // Reset form for new MCQ
      setStem('');
      setChoices(defaultChoices);
      setCorrectKey('A');
      setExplanation('');
      setDifficulty('medium');
    }
  }, [mcq, open]);

  const handleChoiceChange = (key: string, text: string) => {
    setChoices((prev) =>
      prev.map((c) => (c.key === key ? { ...c, text } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all choices have text
    if (choices.some((c) => !c.text.trim())) {
      return;
    }

    const formData = {
      stem,
      choices,
      correct_key: correctKey,
      explanation: explanation || null,
      difficulty: isAdmin ? difficulty : null,
    };

    if (isEditing && mcq) {
      updateMutation.mutate(
        { id: mcq.id, data: formData, moduleId, chapterId },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(
        { ...formData, module_id: moduleId, chapter_id: chapterId || null },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[99999]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit MCQ' : 'Add New MCQ'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Stem */}
          <div className="space-y-2">
            <Label htmlFor="stem">Question *</Label>
            <Textarea
              id="stem"
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              placeholder="Enter the question..."
              required
              rows={3}
            />
          </div>

          {/* Choices A-E */}
          <div className="space-y-3">
            <Label>Choices *</Label>
            {CHOICE_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center rounded-full border-2 font-semibold text-sm shrink-0">
                  {key}
                </span>
                <Input
                  value={choices.find((c) => c.key === key)?.text || ''}
                  onChange={(e) => handleChoiceChange(key, e.target.value)}
                  placeholder={`Option ${key}`}
                  required
                />
              </div>
            ))}
          </div>

          {/* Correct Answer */}
          <div className="space-y-2">
            <Label>Correct Answer *</Label>
            <Select value={correctKey} onValueChange={setCorrectKey}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select correct answer" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {CHOICE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (optional)</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why this is the correct answer..."
              rows={3}
            />
          </div>

          {/* Difficulty - ONLY visible to admin/superadmin */}
          {isAdmin && (
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="z-[99999]">
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Question'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
